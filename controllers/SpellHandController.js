const BasicController = require('./BasicController');

/**
 * 拼手气控制器
 */
class SpellHandController extends BasicController {
  constructor(modelName) {
    super(modelName);

    /**
     * 根据商家或商品查询拼手气
     * @param req
     * @param res
     * @param next
     */
    this.list_by_mg = (req, res, next) => {
      this.getService().list_by_mg({...req.query, ...req.body}, (data) => {
        res.json(data);
      });
    };
  }
}

module.exports = SpellHandController;