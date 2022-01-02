const paytmInitiatePayment = async (req, res) => {
  const { amount, name, phone } = req.body

  const OrderId = 'ORDER_' + new Date().getTime() + '_' + phone

  var paytmParams = {}

  paytmParams.body = {
    requestType: 'Payment',
    mid: config.PaytmConfig.mid,
    websiteName: 'App name',
    orderId: OrderId,
    callbackUrl: `https://securegw.paytm.in/theia/paytmCallback?ORDER_ID=${OrderId}`,
    txnAmount: {
      value: amount,
      currency: 'INR',
    },
    userInfo: {
      custId: name,
    },
  }

  const checkSum = await Paytm.generateSignature(
    JSON.stringify(paytmParams.body),
    config.PaytmConfig.key
  )

  paytmParams.head = {
    signature: checkSum,
  }

  var post_data = JSON.stringify(paytmParams)

  var options = {
    /* for Staging */
    hostname: 'securegw.paytm.in' /* for Production */, // hostname: 'securegw.paytm.in',
    port: 443,
    path: `/theia/api/v1/initiateTransaction?mid=${config.PaytmConfig.mid}&orderId=${OrderId}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': post_data.length,
    },
  }

  const response = await doRequest(options, post_data)

  console.log(response)

  res.json({
    txnToken: response.body.txnToken,
    mid: config.PaytmConfig.mid,
    orderId: OrderId,
    isStage: false,
  })
}
