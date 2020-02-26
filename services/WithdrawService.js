const BasicService = require('./BasicService');
const AccountService = require('./AccountService');

/**
 * 提现业务处理类
 */
class WithdrawService extends BasicService {
  constructor(modelName) {
    super(modelName);

    /**
     * 当日转账次数查询
     * @param user_id
     * @param callback
     */
    this.transfer_times = (user_id, callback = () => {
    }) => {
      if (user_id) {

      } else {
        callback({status: 'failure', message: '用户不可为空'})
      }
    };
  }
}

module.exports = WithdrawService;