const BasicService = require('./BasicService');

/**
 * 配送地址业务处理类
 */
class AddressService extends BasicService {
  constructor(modelName) {
    super(modelName);
  }
}


module.exports = AddressService;