/**
 * 自动启动服务
 */
const SystemConfig = require('./SystemConfig');
const {
  // order: OrderService,
  payment: PaymentService,
  // orderStatus: OrderStatusService
} = require('../services');


const {
  payment: Payment,
  order: Order,
} = require('../models');

const paymentService = new PaymentService('payment');

const {commonMySQL: MySQL} = require('../commons/mysql');
const {Op} = MySQL;
const log4js = require('../commons/Log4jsConfig');
const logger = log4js.getLogger('commons.AutoLauncher');

/**
 * 订单侦听器：处理已经付款但是因某种条件不满足或者某种原因导致的订单失败的退款
 */
const refund_order_listener = () => {
  logger.info('退款侦听程序扫描中......');
  Payment.belongsTo(Order, {foreignKey: 'order_id'});
  Payment.findAll({
    attributes: ['pay_charge'],
    where: {
      pay_type: '1',
      pay_charge: {
        [Op.ne]: null
      }
    },
    offset: 0,
    limit: 10000,
    include: [{
      model: Order,
      attributes: ['order_id'],
      where: {
        status: '30'
      }
    }]
  }).then(payments => {
    payments.forEach(payment => {
      const order = payment['spell_order'];
      paymentService.refund_request({
        out_trade_no: order['order_id'],
        total_fee: payment['pay_charge'],
        refund_fee: payment['pay_charge'],
        refund_desc: '参与的拼手气拼团失败退款',
        pay_type: 2
      }, result => {
        if (result.status === 'success') {
          logger.info(`订单[${order['order_id']}]退款中，金额：${payment['pay_charge'] / 100}元`);
        }
      });
    });
  }).catch(error => console.log(error.message));
};

/**
 * 退款给中奖用户
 */
const refund_to_luck_user = () => {
  const sql = 'SELECT o.order_id out_trade_no,p.pay_charge total_fee, p.pay_charge / o.goods_num * o.free_num refund_fee\n' +
      'FROM spell_hand sh\n' +
      '  JOIN spell_order o ON sh.hand_id = o.hand_id\n' +
      '  JOIN payment p ON o.order_id = p.order_id\n' +
      'WHERE o.order_id IN (\n' +
      '    SELECT p2.order_id\n' +
      '    FROM payment p2\n' +
      '    WHERE p2.order_id = p.order_id\n' +
      '    GROUP BY p2.order_id\n' +
      '    HAVING count(p2.order_id) = 1\n' +
      ')\n' +
      '  AND sh.status = \'100\'\n' +
      '  AND o.free_num > 0\n' +
      '  AND o.status = ' + SystemConfig.get_property('luck_order_refund_status');
  MySQL.query(sql).then(results => {
    const rows = results[0];
    rows.forEach(refund_info => {
      refund_info['refund_fee'] = Number(refund_info['refund_fee']);
      refund_info['pay_type'] = 3;
      refund_info['refund_desc'] = '活动优惠，中奖金额';
      paymentService.refund_request(refund_info);
    });
  });
};

const launch = () => {
  logger.info('侦听服务启动');
  setInterval(() => {
    refund_to_luck_user();
  }, 1000 * 60);

  setInterval(() => {
    refund_order_listener();
  }, 1000 * 60 * 3);
};

module.exports = {
  launch: launch
};