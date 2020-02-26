const wxpay = require("../wxpay-api/wxpay")
// wxpay.unifiedorder({ body: '', total_fee: 0, openid: '' }, { fail: console.error, success: console.log })
const out_trade_no = '201906191017025360c7f7'
wxpay.refund({
  out_trade_no: out_trade_no,
  total_fee: 2,
  refund_fee: 2
}, {fail: console.error, success: console.log})
// wxpay.orderquery({ out_trade_no: out_trade_no }, { fail: console.error, success: console.log })
// wxpay.refundquery({ out_trade_no: out_trade_no }, { fail: console.error, success: console.log })