const newOrder = async (req, res) => {
  //CREATE NEW ORDER HERE
  var paymentDetails = {
    amount: req.params.amount,
    customerId: req.params.name,
    customerEmail: req.params.name,
    customerPhone: req.params.phone,
  }
  if (
    !paymentDetails.amount ||
    !paymentDetails.customerId ||
    !paymentDetails.customerEmail ||
    !paymentDetails.customerPhone
  ) {
    res.status(400).send('Payment failed')
  } else {
    var params = {}

    const ORDER_ID =
      'ORDER_' + new Date().getTime() + '_' + paymentDetails.customerPhone

    params['MID'] = config.PaytmConfig.mid
    params['WEBSITE'] = config.PaytmConfig.website
    params['CHANNEL_ID'] = process.env.CHANNELID
    params['INDUSTRY_TYPE_ID'] = 'Retail'
    params['ORDER_ID'] = ORDER_ID
    params['CUST_ID'] = paymentDetails.customerId
    params['TXN_AMOUNT'] = paymentDetails.amount
    params[
      'CALLBACK_URL'
    ] = `https://securegw.paytm.in/theia/paytmCallback?ORDER_ID=${ORDER_ID}`

    params['EMAIL'] = paymentDetails.customerEmail
    params['MOBILE_NO'] = paymentDetails.customerPhone

    var paytmChecksum = await Paytm.generateSignature(
      params,
      config.PaytmConfig.key
    )

    console.log(paytmChecksum)

    var txn_url = process.env.TXN_URL

    var form_fields = ''
    for (var x in params) {
      form_fields +=
        "<input type='hidden' name='" + x + "' value='" + params[x] + "' >"
    }
    form_fields +=
      "<input type='hidden' name='CHECKSUMHASH' value='" + paytmChecksum + "' >"

    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.write(
      '<html><head><title>Merchant Checkout Page</title></head><body><center><h1>Please do not refresh this page...</h1></center><form method="post" action="' +
        txn_url +
        '" name="f1">' +
        form_fields +
        '</form><script type="text/javascript">document.f1.submit();</script></body></html>'
    )
    res.end()
  }
}

const VerifyPayment = async (req, res) => {
  try {
    console.log(req.body)
    var paytmChecksum = req.body.CHECKSUMHASH
    var isVerifySignature = await Paytm.verifySignature(
      req.body,
      process.env.MERCHANTKEY,
      paytmChecksum
    )

    console.log(req.body)

    var userPhone = req.body.ORDERID.split('_')[2]

    const user = await Driver.findOne({ Phone_No: userPhone })

    const wallet = await Wallet.findOne({ owner: user._id })

    if (isVerifySignature) {
      if (req.body.RESPCODE == '01') {
        console.log('TXN SUCCESS')

        wallet.totalAmount += parseInt(req.body.TXNAMOUNT)

        await wallet.save()

        console.log(wallet)

        const addTransaction = await Transaction.create({
          walletId: wallet._id,
          userId: user._id,
          amount: parseInt(req.body.TXNAMOUNT),
          transactionType: 'Deposit',
          status: 'Success',
          approved: 'yes',
        })
        console.log(addTransaction)
        return res.json({ message: 'Amount Added Succesfully in  wallet' })
      } else {
        const addTransaction = await Transaction.create({
          walletId: wallet._id,
          userId: user._id,
          amount: parseInt(req.body.TXNAMOUNT),
          transactionType: 'Deposit',
          status: 'Failed',
          approved: 'yes',
        })
        console.log(addTransaction)
        return res.json({ error: 'TXN FAILURE' })
      }
    } else {
      return res.json({ error: 'TXN_NOT_LEGIT' })
    }
  } catch (error) {
    console.log(error)
    return res.json({ error: 'Soemthing went Wrong' })
  }
}
