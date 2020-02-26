const {DataTypes} = require('sequelize');
const {commonMySQL, dateFormat} = require('../commons/mysql');

/**
 * 用户模型
 */
const User = commonMySQL.define('user', {
  user_id: {
    type: DataTypes.BIGINT(20).UNSIGNED.ZEROFILL,
    autoIncrement: true,
    primaryKey: true
  },
  open_id: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true
  },
  weixin_name: {
    type: DataTypes.STRING(50),
    comment: '微信昵称'
  },
  avatar_url: {
    type: DataTypes.STRING(200),
    comment: '微信头像'
  },
  user_name: {
    type: DataTypes.STRING(30),
    comment: '真实姓名'
  },
  phone_num: {
    type: DataTypes.STRING(30),
    comment: '手机号码'
  },
  role: {
    type: "SET('visitor','merchant','hander','admin')",
    defaultValue: 'visitor',
    comment: '角色'
  },
  country: {
    type: DataTypes.STRING(20),
    comment: '国家'
  },
  province: {
    type: DataTypes.STRING(20),
    comment: '省份'
  },
  city: {
    type: DataTypes.STRING(20),
    comment: '城市'
  },
  created_time: {
    type: DataTypes.TIME,
    get: function (attribute) {
      return dateFormat(this, attribute);
    },
    comment: '注册时间'
  },
  updated_time: {
    type: DataTypes.TIME,
    get: function (attribute) {
      return dateFormat(this, attribute);
    },
    comment: '更新时间'
  }
});


module.exports = User;