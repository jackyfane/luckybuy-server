const BasicController = require('./BasicController');

/**
 * 拼手气费用明细控制器
 */
class FeeDetailController extends BasicController {
  constructor(modelName) {
    super(modelName);

    this.item_fee = (req, res, next) => { this.getService().item_fee({ ...req.query, ...req.body }, rlt => { res.json(rlt) }) }

  }
}

module.exports = FeeDetailController;