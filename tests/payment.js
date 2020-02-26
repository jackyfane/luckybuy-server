const where = {
  hand_id: hand_id,
  pay_type: 1
};
if (!isEmpty(discounts)) {
  const keys = Object.keys(discounts);
  where['order_id'] = {
    [this.getOp().in]: keys
  };
}
const Payment = this.getModel();
Payment.belongsTo(Order, {
  foreignKey: 'order_id'
});
Payment.belongsTo(User, {
  foreignKey: 'user_id'
});
Payment.findAll({
  where: where,
  include: [{
    model: Order,
    required: true,
    attributes: ['order_id', 'charge'],
    where: {
      status: 1
    }
  }, {
    model: User,
    required: true,
    attributes: ['open_id']
  }]
}).then(rows => {
  console.log(JSON.stringify(rows));
}).catch(error => console.log(error));