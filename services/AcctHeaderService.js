const BasicService = require('./BasicService');
const AccountService = require('./AccountService');

/**
 * 拼头账户业务处理类
 */
class AcctHeaderService extends BasicService {

  constructor(modelName) {

    super(modelName);

    /**
     * 创建账户
     * @param {Object} params
     * @param {function} callback
     */
    this.create = (params, callback = () => {
    }) => {
      AccountService.create(this.getModel(), params, callback);
    };

    /**
     * 提现
     * @param {Object} params
     * @param {function} callback
     */
    this.withdraw = (params, callback = () => {
    }) => {
      AccountService.withdraw(this.getModel(), params, this.generate_primary_key, result => {
        callback(result);
      });
    };

    const fb = this.findById
    this.findById = (id, cb, { limit, typ }) => {
      fb(id, ret => {
        if (ret.status != 'success') return cb(ret)
        AccountService.detail({ consumer: id, limit, typ }, list => {
          cb({ status: 'success', data: { sumy: ret.data, list } })
        }, err => cb({ status: 'failure', message: err }))
      })
    }

  }
}

module.exports = AcctHeaderService;