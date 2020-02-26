const {DataTypes} = require('sequelize');
const {commonMySQL, dateFormat} = require('../commons/mysql');
const SpellHand = require('../models/SpellHand');

/**
 * 拼手气费用明细
 */
const FeeDetail = commonMySQL.define('fee_detail', {
  detail_id: {
    type: DataTypes.BIGINT(20).UNSIGNED,
    autoIncrement: true,
    primaryKey: true
  },
  hand_id: {
    type: DataTypes.BIGINT(20).UNSIGNED,
    references: {
      key: 'hand_id',
      model: SpellHand
    }
  },
  total_cost: DataTypes.INTEGER(11),
  header_fee: DataTypes.INTEGER(11),
  wechat_fee: DataTypes.INTEGER(11),
  sp_fee: DataTypes.INTEGER(11),
  discount_fee: DataTypes.INTEGER(11),
  merchant_fee: DataTypes.INTEGER(11),
  status: DataTypes.INTEGER(6),
  created_time: {
    type: DataTypes.DATE,
    get: function (attribute) {
      return dateFormat(this, attribute);
    }
  },
  updated_time: {
    type: DataTypes.TIME,
    get: function (attribute) {
      return dateFormat(this, attribute);
    }
  }
});


module.exports = FeeDetail;