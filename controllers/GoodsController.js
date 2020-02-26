const BasicController = require('./BasicController');

/**
 * 商品控制器
 */
class GoodsController extends BasicController {
  constructor(modelName) {
    super(modelName);

    /**
     * 根据商家查询商品信息
     * @param req
     * @param res
     * @param next
     */
    this.list_by_merchant = (req, res, next) => {
      this.getService().list_by_merchant({ ...req.query, ...req.body }, (data) => {
        res.json(data);
      });
    };

    /** 查询正在进行的活动 */
    this.spelling = (req, res, next) => this.getService().spelling({ ...req.query, ...req.body }, (data) => res.json(data));

  }
}

module.exports = GoodsController;