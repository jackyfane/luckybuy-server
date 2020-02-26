const {DataTypes} = require('sequelize');
const {commonMySQL, dateFormat} = require('../commons/mysql');
const User = require('./User');

/**
 * 配送地址
 */
const Address = commonMySQL.define('address', {
  addr_id: {
    type: DataTypes.BIGINT(20).UNSIGNED,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.BIGINT(20).UNSIGNED,
    references: {
      model: User,
      key: 'user_id'
    }
  },
  receiver: DataTypes.STRING(30),
  phone_num: DataTypes.STRING(30),
  country: DataTypes.STRING(20),
  province: DataTypes.STRING(20),
  city: DataTypes.STRING(20),
  district: DataTypes.STRING(20),
  address: DataTypes.STRING(100),
  post_code: DataTypes.STRING(20),
  created_time: {
    type: DataTypes.DATE,
    get: function (attribute) {
      return dateFormat(this, attribute);
    }
  },
  updated_time: {
    type: DataTypes.DATE,
    get: function (attribute) {
      return dateFormat(this, attribute);
    }
  }
});

module.exports = Address;