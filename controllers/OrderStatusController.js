const BasicController = require('./BasicController');
const services = require('../services');

/**
 * 订单状态控制器
 */
class OrderStatusController extends BasicController {
  constructor(modelName) {
    super(modelName);
  }
}

module.exports = OrderStatusController;