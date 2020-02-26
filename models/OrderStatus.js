const {DataTypes} = require('sequelize');
const {commonMySQL, dateFormat} = require('../commons/mysql');
const Order = require('./Order');
const Status = require('./Status');

const OrderStatus = commonMySQL.define('order_status', {
  sos_id: {
    type: DataTypes.BIGINT(20).UNSIGNED,
    autoIncrement: true,
    primaryKey: true
  },
  order_id: {
    type: DataTypes.STRING(64),
    references: {
      model: Order,
      key: 'order_id'
    }
  },
  status_code: {
    type: DataTypes.STRING(6),
    references: {
      model: Status,
      key: 'status_code'
    }
  },
  status_expired:{
    type: DataTypes.DATE,
    get: function (attribute) {
      return dateFormat(this, attribute);
    }
  },
  is_delayed: DataTypes.BOOLEAN,
  reason: DataTypes.STRING(255),
  created_time: {
    type: DataTypes.DATE,
    get: function (attribute) {
      return dateFormat(this, attribute);
    }
  }
});


module.exports = OrderStatus;