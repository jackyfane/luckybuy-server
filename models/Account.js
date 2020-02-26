const sequelize = require('sequelize');
const {dateFormat} = require('../commons/mysql');
const User = require('./User');

module.exports = {
  attributes: {
    user_id: {
      type: sequelize.DataTypes.BIGINT(20).UNSIGNED,
      primaryKey: true,
      references: {
        model: User,
        key: 'user_id'
      }
    },
    total_amount: sequelize.DataTypes.BIGINT(20).UNSIGNED,
    total_withdraw: sequelize.DataTypes.BIGINT(20).UNSIGNED,
    updated_time: {
      type: sequelize.DataTypes.DATE,
      get: function (attribute) {
        return dateFormat(this, attribute);
      }
    },
    created_time: {
      type: sequelize.DataTypes.DATE,
      get: function (attribute) {
        return dateFormat(this, attribute);
      }
    }
  },
  options: {}
};