const BasicController = require('./BasicController');

/**
 * 提现控制器
 */
class WithdrawController extends BasicController {
  constructor(modelName) {
    super(modelName);
  }
}

module.exports = WithdrawController;