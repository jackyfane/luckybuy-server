const BasicController = require('./BasicController');

/**
 * 系统配置控制器
 */
class ConfigController extends BasicController {
  constructor(modelName) {
    super(modelName);
  }
}

module.exports = ConfigController;