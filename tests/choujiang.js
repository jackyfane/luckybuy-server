const orders_array = [
  '20190401105646c9814bc0',
  '20190401110247a0eb8b4d',
  '201904011114153adf6b73',
  '2019040111145250f23ca5',
  '2019040111145250f23ca5',
  '20190401111747b94f1e60',
  '20190401111747b94f1e60'
];

const orders_ernie = (orders, free_cnt) => {
  const lucky_orders = {};
  if (free_cnt <= 0) return lucky_orders;
  //随机抽奖，确定订单及其免单数
  for (let i = 0; i < free_cnt; i++) {
    const index = Math.min(Math.floor(Math.random() * orders.length), orders.length - 1);
    const order_id = orders[index];
    orders = orders.filter((t, j) => j !== index);
    lucky_orders[order_id] = (lucky_orders[order_id] || 0) + 1;
  }
  return lucky_orders;
};

// console.log(orders_ernie(orders_array, 3));