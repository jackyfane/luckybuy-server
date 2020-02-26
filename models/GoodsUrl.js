const {DataTypes} = require('sequelize');
const {commonMySQL} = require('../commons/mysql');

const Goods = require('./Goods');

const GoodsUrl = commonMySQL.define('goods_url', {
  goods_id: {
    type: DataTypes.BIGINT(20).UNSIGNED,
    references: {
      model: Goods,
      key: 'goods_id'
    }
  },
  image_url: {
    type: DataTypes.STRING(255),
    unique: true
  },
  image_level: DataTypes.TINYINT(3).UNSIGNED
});
GoodsUrl.removeAttribute('id');
module.exports = GoodsUrl;