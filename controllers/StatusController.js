const BasicController = require('./BasicController');
const services = require('../services');

/**
 * 状态控制器
 */
class StatusController extends BasicController {
  constructor(modelName) {
    super(modelName);
  }
}

module.exports = StatusController;