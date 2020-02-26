const BasicService = require('./BasicService');

/**
 * 商家业务处理类
 */
class MerchantService extends BasicService {
  constructor(modelName) {
    super(modelName);
  }
}


module.exports = MerchantService;