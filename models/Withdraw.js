const {DataTypes} = require('sequelize');
const {commonMySQL, dateFormat} = require('../commons/mysql');
const User = require('./User');

/**
 * 用户模型
 */
const Withdraw = commonMySQL.define('withdraw_detail', {
  withdraw_id: {
    type: DataTypes.STRING(32),
    primaryKey: true
  },
  withdraw_from: {
    type: DataTypes.BIGINT(30),
    comment: '提现资金来源'
  },
  withdraw_to: {
    type: DataTypes.BIGINT(20).UNSIGNED,
    references: {
      model: User,
      key: 'user_id'
    },
    comment: '提现用户'
  },
  withdraw_amount: {
    type: DataTypes.BIGINT(20),
    comment: '提现金额'
  },
  created_time: {
    type: DataTypes.TIME,
    get: function (attribute) {
      return dateFormat(this, attribute);
    },
    comment: '提现时间'
  }
});


module.exports = Withdraw;