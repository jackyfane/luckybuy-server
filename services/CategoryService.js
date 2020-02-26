const BasicService = require('./BasicService');

/**
 * 商品分类业务处理类
 */
class CategoryService extends BasicService {
  constructor(modelName) {
    super(modelName);
  }
}


module.exports = CategoryService;