const {DataTypes} = require('sequelize');
const {commonMySQL, dateFormat} = require('../commons/mysql');
const User = require('./User');

const Merchant = commonMySQL.define('merchant', {
  merchant_id: {
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
  avatar_url: DataTypes.STRING(128),
  merchant_name: {
    type: DataTypes.STRING(30),
    unique: true,
    allowNull: false
  },
  merchant_addr: DataTypes.STRING(128),
  merchant_phone: DataTypes.STRING(30),
  merchant_desc: DataTypes.STRING(512),
  delivery_method: {
    type: DataTypes.ENUM,
    values: ['到店自提','快递到付','送货上门','快递预付']
  },
  registed_time: {
    type: DataTypes.TIME,
    get: function (attribute) {
      return dateFormat(this, attribute);
    }
  }
});

module.exports = Merchant;