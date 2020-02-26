const BasicController = require('./BasicController');

/**
 * 订单控制器
 */
class OrderController extends BasicController {

  constructor(modelName) {
    super(modelName);

    /**
     * 商家延延迟发货
     * @param req
     * @param res
     * @param next
     */
    this.shipping_delay = (req, res, next) => {
      const hand_id = {...req.query, ...req.body}['order_id'];
      this.getService().shipping_delay(hand_id, result => {
        res.json(result);
      });
    };

    /**
     * 延迟收货
     * @param req
     * @param res
     * @param next
     */
    this.receiving_delay = (req, res, next) => {
      const order_id = {...req.query, ...req.body}['order_id'];
      this.getService().receiving_delay(order_id, result => {
        res.json(result);
      });
    };
  }
}

module.exports = OrderController;