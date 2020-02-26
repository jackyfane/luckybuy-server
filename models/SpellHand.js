const {DataTypes} = require('sequelize');
const {
  commonMySQL,
  dateFormat
} = require('../commons/mysql');
const User = require('./User');
const Goods = require('./Goods');

/**
 * 拼手气
 */
const SpellHand = commonMySQL.define('spell_hand', {
  hand_id: {
    type: DataTypes.BIGINT(20).UNSIGNED,
    autoIncrement: true,
    primaryKey: true
  },
  goods_id: {
    type: DataTypes.BIGINT(20).UNSIGNED,
    references: {
      model: Goods,
      key: 'goods_id'
    }
  },
  user_id: {
    type: DataTypes.BIGINT(20).UNSIGNED,
    references: {
      model: User,
      key: 'user_id'
    }
  },
  status: DataTypes.TINYINT(4),
  person_num: DataTypes.SMALLINT(5),
  spelled_num: DataTypes.SMALLINT(5),
  // rate: {
  //   type: DataTypes.DECIMAL(2, 2),
  //   validate: {
  //     min: 0.0,
  //     max: 1.0
  //   }
  // },
  free_num: {
    type: DataTypes.SMALLINT(5),
    comment: '免单数，如果小于0则表示拼手气成功后根据销量计算出免单数，如果大于等于零则表示固定免单数'
  },
  start_time: {
    type: DataTypes.DATE,
    get: function (attribute) {
      return dateFormat(this, attribute);
    }
  },
  end_time: {
    type: DataTypes.DATE,
    get: function (attribute) {
      return dateFormat(this, attribute);
    }
  },
  finish_time: {
    type: DataTypes.DATE,
    get: function (attribute) {
      return dateFormat(this, attribute);
    }
  },
  created_time: {
    type: DataTypes.DATE,
    get: function (attribute) {
      return dateFormat(this, attribute);
    }
  }
});


module.exports = SpellHand;