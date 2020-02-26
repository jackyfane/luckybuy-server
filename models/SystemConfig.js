const {DataTypes} = require('sequelize');
const {commonMySQL, dateFormat} = require('../commons/mysql');

const Config = commonMySQL.define('system_config', {
  sc_id: {
    type: DataTypes.MEDIUMINT(8).UNSIGNED.ZEROFILL,
    autoIncrement: true,
    primaryKey: true
  },
  item_name: {
    type: DataTypes.STRING(80),
    unique: true
  },
  item_value: DataTypes.STRING(80),
  default_value: DataTypes.STRING(80),
  description: DataTypes.STRING(255),
  created_time: {
    type: DataTypes.DATE,
    get: function (attribute) {
      return dateFormat(this, attribute);
    }
  }
});

module.exports = Config;