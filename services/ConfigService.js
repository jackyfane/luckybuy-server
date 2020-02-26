const BasicService = require('./BasicService');

/**
 * 系统配置业务处理类
 */
class ConfigService extends BasicService {
  constructor(modelName) {
    super(modelName);
  }
}


module.exports = ConfigService;