const {DataTypes} = require('sequelize');
const {
  commonMySQL,
  dateFormat
} = require('../commons/mysql');
const User = require('./User');
const SpellHand = require('./SpellHand');
const Address = require('./Address');

const Order = commonMySQL.define('spell_order', {
  order_id: {
    type: DataTypes.STRING(64),
    autoIncrement: true,
    primaryKey: true
  },
  hand_id: {
    type: DataTypes.BIGINT(20).UNSIGNED,
    references: {
      model: SpellHand,
      key: 'hand_id'
    }
  },
  user_id: {
    type: DataTypes.BIGINT(20).UNSIGNED,
    references: {
      model: User,
      key: 'user_id'
    }
  },
  delivery: DataTypes.STRING(16),
  addr_id: {
    type: DataTypes.BIGINT(20).UNSIGNED,
    references: {
      model: Address,
      key: 'addr_id'
    }
  },
  goods_num: {
    type: DataTypes.SMALLINT(6),
    validate: {
      min: 0
    }
  },
  free_num: {
    type: DataTypes.SMALLINT(6),
    validate: {
      min: 0
    }
  },
  status: DataTypes.STRING(6),
  prepay_info: {
    type: DataTypes.JSON,
    comment: '预支付信息，调微信支付下单接口时返回的预支付交易会话标识，用于小程序用户调用支付'
  },
  created_time: {
    type: DataTypes.DATE,
    get: function (attribute) {
      return dateFormat(this, attribute);
    }
  }
});

module.exports = Order;