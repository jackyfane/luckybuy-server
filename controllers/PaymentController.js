const BasicController = require('./BasicController');
const pay_utils = require('../wxpay-api/utils');
const pay_cfg = require('../wxpay-api/cfg');

/**
 * 费用支付控制器
 */
class PaymentController extends BasicController {
  constructor(modelName) {

    super(modelName);

    /**
     * 付款通知
     * @param req
     * @param res
     * @param next
     */
    this.payment_notify = (req, res, next) => {
      const json = pay_utils.xml2js(req.body);
      const signature = pay_utils[((json.sign_type || 'MD5') == 'HMAC-SHA256') ? "sign_hmac_sha256" : "sign_md5"](json) !== json.sign;

      let reason = '';
      if (req.header('content-type') !== 'text/xml') {
        reason = '参数格式错误';
      } else if (signature) {
        reason = '签名检查失败';
      } else if (json.appid != pay_cfg.appid) {
        reason = '小程序ID错误'
      } else if (json.mch_id != pay_cfg.mch_id) {
        reason = '商户号错误'
      }
      const return_msg = pay_utils.js2xml({
        return_code: reason == '' ? 'SUCCESS' : 'FAIL',
        return_msg: reason == '' ? 'OK' : reason
      });

      this.getService().payment_notify(json);
      res.type('xml').end(return_msg);

    };

    /**
     * 退款通知
     * @param req
     * @param res
     * @param next
     */
    this.refund_notify = (req, res, next) => {
      const json = pay_utils.xml2js(req.body);
      const req_info = pay_utils.xml2js(pay_utils.decrypt(json.req_info));

      this.getService().refund_notify({...json, ...req_info});

      res.type('xml').end(pay_utils.js2xml({
        return_code: 'SUCCESS',
        return_msg: 'OK'
      }));
    };
  }
}

module.exports = PaymentController;