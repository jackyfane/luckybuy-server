const {DataTypes} = require('sequelize');
const {commonMySQL, dateFormat} = require('../commons/mysql');
const Order = require('./Order');
const SpellHand = require('./SpellHand');
const User = require('./User')


const Payment = commonMySQL.define('payment', {

  pay_id: {
    type: DataTypes.STRING(64),
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
  hand_id: {
    type: DataTypes.BIGINT(20).UNSIGNED,
    references: {
      model: SpellHand,
      key: 'hand_id'
    }
  },
  user_id: {
    type: DataTypes.BIGINT(20).UNSIGNED,
    references: {
      model: User,
      key: 'user_id'
    }
  },
  pay_charge: DataTypes.INTEGER(11),
  pay_type: DataTypes.TINYINT(4),
  payed_time: {
    type: DataTypes.DATE,
    get: function (attribute) {
      return dateFormat(this, attribute);
    }
  }
});

// Payment.belongsTo(Order, {foreignKey:'order_id'});
// Payment.belongsTo(User, {foreignKey: 'user_id'});
// Payment.findAll({
//   attributes:['pay_charge'],
//   where: {hand_id: 3, pay_type:1},
//   include:[{
//     model:Order,
//     required:true,
//     attributes:['order_id'],
//     where: {
//       status: 1
//     }
//   },{
//     model: User,
//     required:true,
//     attributes:['open_id']
//   }]
// }).then(rows=>console.log(JSON.stringify(rows)))
// .catch(error=>console.log(error));


module.exports = Payment;