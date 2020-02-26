const {DataTypes} = require('sequelize');
const {commonMySQL, dateFormat} = require('../commons/mysql');
const Merchant = require('./Merchant');
const Category = require('./Category');

/**
 * 商品
 */
const Goods = commonMySQL.define("goods", {
  goods_id: {
    type: DataTypes.BIGINT(20).UNSIGNED,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true
  },
  merchant_id: {
    type: DataTypes.BIGINT(20).UNSIGNED,
    references: {
      model: Merchant,
      key: 'merchant_id'
    }
  },
  cat_id: {
    type: DataTypes.MEDIUMINT(8).UNSIGNED,
    references: {
      model: Category,
      key: 'cat_id'
    }
  },
  goods_name: DataTypes.STRING(128),
  goods_number: DataTypes.INTEGER(11),
  saled_number: DataTypes.INTEGER(11),
  goods_desc: DataTypes.STRING(512),
  goods_intro: DataTypes.STRING,
  market_price: DataTypes.INTEGER(11),
  come_price: DataTypes.INTEGER(11),
  promote_price: DataTypes.INTEGER(11),
  free_min_num: {
    type: DataTypes.SMALLINT(5).UNSIGNED,
    validate: {
      min: 0
    }
  },
  expect_min_profit: {
    type: DataTypes.DECIMAL(4, 4).UNSIGNED,
    validate: {
      min: 0.0,
      max: 1.0
    }
  },
  commission_rate: {
    type: DataTypes.DECIMAL(4, 4).UNSIGNED,
    validate: {
      min: 0.0,
      max: 1.0
    }
  },
  poundage_rate: {
    type: DataTypes.DECIMAL(4, 4).UNSIGNED,
    validate: {
      min: 0.0,
      max: 1.0
    }
  },
  deliverys: {
    type: DataTypes.ENUM,
    values: ['到店自提', '快递到付', '送货上门', '快递预付']
  },
  created_time: {
    type: DataTypes.TIME,
    get: function (attribute) {
      return dateFormat(this, attribute);
    }
  }
});

module.exports = Goods;