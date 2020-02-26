const BasicController = require('./BasicController');

/**
 * 拼头账户控制器
 */
class AcctHeaderController extends BasicController {
  constructor(modelName) {
    super(modelName);

    /**
     * 提现
     * @param  req
     * @param  res
     * @param {Function} next
     */
    this.withdraw = (req, res, next) => {
      this.getService().withdraw({...req.query, ...req.body}, result => {
        res.json(result);
      });
    };
  }
}

module.exports = AcctHeaderController;