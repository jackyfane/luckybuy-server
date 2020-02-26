const BasicService = require('./BasicService');
const AccountService = require('./AccountService');

/**
 * 商家账户业务处理类
 */
class AcctMerchantService extends BasicService {

  constructor(modelName) {
    super(modelName);

    this.create = (params, callback = () => {
    }) => {
      AccountService.create(this.getModel(), params, callback);
    };

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
        AccountService.detail({ producer: id, limit, typ }, list => {
          cb({ status: 'success', data: { sumy: ret.data, list } })
        }, err => cb({ status: 'failure', message: err }))
      })
    }

  }
}


module.exports = AcctMerchantService;