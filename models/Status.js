const {DataTypes} = require('sequelize');
const {commonMySQL} = require('../commons/mysql');

/**
 * 状态模型，与数据库的状态表对应
 */
const Status = commonMySQL.define('status', {
  status_code: {
    type: DataTypes.STRING(6),
    primaryKey: true
  },
  status_name: DataTypes.STRING(100),
  parent_status: DataTypes.STRING(6),
  next_status: DataTypes.STRING(6),
  duration: DataTypes.INTEGER
});

module.exports = Status;