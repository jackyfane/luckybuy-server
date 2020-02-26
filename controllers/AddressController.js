const BasicController = require('./BasicController');

/**
 * 配送地址控制器
 */
class AddressController extends BasicController {
  constructor(modelName) {
    super(modelName);
  }
}

module.exports = AddressController;