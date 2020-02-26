const BasicService = require('./BasicService');
const OrderStatusService = require('./OrderStatusService');
const PaymentService = require('./PaymentService');
const paymentService = new PaymentService('payment');
const orderStatusService = new OrderStatusService('orderStatus');
const {isEmpty} = require('../utils/string.utils');
const logger = require('../commons/Log4jsConfig').getLogger("services.OrderService");
const {
  merchant: Merchant,
  user: User,
  goods: Goods,
  goodsUrl: GoodsUrl,
  spellHand: SpellHand,
  orderStatus: OrderStatus,
  order: Order,
  status: Status,
  address: Address
} = require('../models');

/**
 * 订单业务处理类
 */
class OrderService extends BasicService {

  constructor(modelName) {

    super(modelName);


    /**
     * 创建订单
     * @param {k, v} order_info
     * @param {Transaction} transaction 事务
     * @returns {order_info}
     */
    const create_order = (order_info, transaction) => {
      return this.getModel().create(order_info, {
        transaction
      });
    };


    /**
     * 更新商品销量
     * @param {number} hand_id 拼手气ID
     * @param {number} goods_num 购买分数
     * @param {Transaction} transaction 事务
     * @returns {Promise<Model>}
     */
    const update_goods_sales_volume = (hand_id, goods_num, transaction) => {
      Goods.hasMany(SpellHand, {foreignKey: 'goods_id'});
      return Goods.findAll({
        include: [{
          model: SpellHand,
          attributes: ['hand_id'],
          where: {hand_id: hand_id}
        }]
      }, {transaction}).then(goods => {
        goods.saled_number += goods_num;
        return goods.save({transaction});
      });
    };

    /**
     * 更新拼手气
     * @param {number} hand_id 拼手气ID
     * @param {Transaction} transaction 事务
     * @returns {Promise<Model>}
     */
    const check_spellhand = (hand_id, transaction) => {
      return SpellHand.findByPk(hand_id, {
        transaction
      }).then(spellhand => {
        if (spellhand.finish_time && !spellhand.finish_time == 'Invalid date')
          throw new Error('拼手气已结束');
        const now = new Date().getTime(), //当前时间
            start = new Date(spellhand.start_time).getTime(), //活动开始时间
            end = new Date(spellhand.end_time).getTime(); //活动截止时间
        if (now < start)
          throw new Error('拼手气尚未开始');

        if (spellhand.spelled_num >= spellhand.person_num)
          throw new Error('当前人数已满，稍后查看是否有未付款。');

        //当前时间超过截止时间，更新拼手气结束时间，同时发起退款，并抛出异常：拼手气失败
        if (now > end) {
          spellhand.finish_time = this.getMySQL().fn('now');
          spellhand.save().then(() => { //修改订单状态
            orderStatusService.create_by_spellhand(hand_id, '00', '30', '拼手气活动失败', result => {
              //进行退款
              paymentService.refund_by_spellhand(spellhand);
            });
          });
          throw new Error('拼手气活动失败！');
        }

        // spellhand.spelled_num += 1;
        return spellhand;
        // spellhand.spelled_num += 1;
        // if (spellhand.spelled_num == spellhand.person_num) {
        //   spellhand.finish_time = this.getMySQL().fn('NOW');
        // }
        // return spellhand.save({transaction}).then(spellhand => spellhand);

      });
    };

    /**
     * 创建订单
     * 创建订单涉及到更需要新的内容：
     * 1、创建订单
     * 2、获得拼手气信息并更新参与人数
     * 3、获得商品信息并更新销售量
     * 以上任务必须在一个事务内完成，只要其中一个失败，事务回滚
     * @param {k, v} order_info 订单数据对象
     * @param {CallBack} callback 回调函数
     */
    this.create = (order_info, callback) => {
      if (isEmpty(order_info)) {
        callback({
          status: 'failure',
          message: '数据为空'
        });
      } else {
        //2.通过存储过程
        this.generate_order_pay_pk().then(order_pay_pk => {
          const placeholder = ':order_id,:pay_id,:hand_id,:user_id,:delivery,:addr_id,:goods_num,:goods_id';
          const replacements = {
            order_id: order_pay_pk['order_id'],
            pay_id: order_pay_pk['pay_id'],
            hand_id: order_info['hand_id'],
            user_id: order_info['user_id'],
            delivery: order_info.delivery != undefined ? order_info.delivery : null,
            addr_id: order_info.addr_id != undefined ? order_info.addr_id : null,
            // addr_id: order_info['addr_id'],
            goods_num: order_info['goods_num'],
            goods_id: order_info['goods_id']
          };

          //调用存储过程创建订单
          return this.execute_procedure('prod_create_order', placeholder, replacements).then(result => {
            const return_data = result[0];
            if (return_data['result']) {
              throw new Error(return_data['result']);
            }
            const payment_info = {
              out_trade_no: order_pay_pk['order_id'],
              openid: return_data['open_id'],
              total_fee: return_data['pay_charge'],
              time_start: return_data['pay_effected'],
              time_expire: return_data['pay_expired'],
              body: `参与拼手气【拼号：${order_info['hand_id']}】,购买商品【份数：${order_info['goods_num']}】`
            };
            //发起付款请求
            paymentService.payment_request(payment_info, (result) => {
              callback(result);
              if (result.status === 'failure') {
                orderStatusService.order_rollback(order_pay_pk['order_id'], '11', result.message);
              } else {
                //设置预支付信息
                Order.update({prepay_info: JSON.stringify(result.data)}, {
                  where: {order_id: order_pay_pk['order_id']}
                }).then(result => logger.info("设置预支付信息成功"));
              }
            });
          });
        }).catch(error => callback({status: 'failure', message: error.message}));
      }
    };

    /**
     * 获得拼手气的总销量
     * @param {Number} hand_id
     * @param {Function} callback
     */
    this.sales_by_spellhand = (hand_id, callback) => {
      this.getModel().findOne({
        attributes: [
          [this.getMySQL().fn('SUM', this.getModel().col('goods_num')), 'sale_count']
        ],
        where: {
          hand_id: hand_id,
          status: 1
        }
      }).then(sale_count => callback({
        status: 'success',
        data: sale_count
      })).catch(error => callback({
        status: 'failure',
        message: error.message
      }));
    };

    /**
     * 根据拼手气修改订单状态
     * @param {number} hand_id
     * @param {string} status 状态
     * @param {string} reason 状态更新的原因
     * @param {function} callback 回调函数
     */
    this.update_status_by_spellhand = (hand_id, status, reason, callback) => {
      this.getModel().update({
        status: status
      }, {
        where: {
          hand_id: hand_id,
          status: 1
        }
      }).then(orders => {
        //创建订单状态
        const os_records = orders.map(order => ({
          order_id: order.order_id,
          status: status,
          reason: reason
        }));
        orderStatusService.bulk_create(os_records, callback(data));
      }).catch(error => callback({
        status: 'failure',
        message: error.message
      }));
    };

    /**
     * 根据订单修改订单状态
     * @param {number} order_id 订单ID
     * @param {string} status 状态
     * @param {string} reason 状态变化原因
     */
    this.update_status_by_order = (order_id, status, reason) => {
      this.getModel().update({
        status: status
      }, {
        where: {
          order_id: order_id
        }
      }).then(order => {
        //创建订单状态
        orderStatusService.create({
          order_id: order.order_id,
          status: status,
          reason: reason
        }, () => {
        });
      })
    };

    /**
     * 商家根据拼手气批量延迟订单发货发时间
     * @param {number} hand_id
     * @param {function} callback
     */
    this.shipping_delay_bulk = (hand_id, callback = () => {
    }) => {
      const sql = 'UPDATE order_status os\n' +
          'SET os.status_expired = date_add(os.status_expired, INTERVAL\n' +
          '                                 (SELECT item_value FROM system_config WHERE item_name = \'shipment_max_delay\') DAY),\n' +
          '    os.is_delayed     = TRUE\n' +
          'WHERE exists(SELECT *\n' +
          '             FROM spell_order so\n' +
          '             WHERE os.order_id = so.order_id\n' +
          '               AND os.status_code = so.status\n' +
          '               AND so.status = \'21\' -- 待发货状态\n' +
          '               AND so.hand_id = ?\n' +
          '    )\n' +
          '  AND os.is_delayed = FALSE';
      const replacements = [hand_id];
      const query_type = this.getMySQL().QueryTypes.UPDATE;
      this.raw_query(sql, replacements, query_type, callback);
    };

    /**
     * 订单延时处理
     * @param {string} order_id 订单ID
     * @param {string} status_code 状态码
     * @param {function} callback 回调函数
     */
    const order_delay_deal = (order_id, status_code, callback) => {
      const sql = 'UPDATE order_status os\n' +
          'SET os.status_expired = date_add(os.status_expired, INTERVAL\n' +
          '                                 (SELECT item_value FROM system_config WHERE item_name = \'shipment_max_delay\') DAY),\n' +
          '    os.is_delayed     = TRUE\n' +
          'WHERE exists(\n' +
          '    SELECT *\n' +
          '    FROM spell_order so\n' +
          '    WHERE os.status_code = so.status\n' +
          '      AND so.status = ? -- 待发货\n' +
          '      AND so.order_id = ?\n' +
          '    )\n' +
          '  AND os.status_code = ?\n' +
          '  AND os.is_delayed = FALSE';
      const replacements = [status_code, order_id, status_code];
      const query_type = this.getMySQL().QueryTypes.UPDATE;
      this.raw_query(sql, replacements, query_type, callback);
    };

    /**
     * 商家根据订单延长发货时间
     * @param {string} order_id
     * @param {function} callback
     */
    this.shipping_delay = (order_id, callback = () => {
    }) => {
      order_delay_deal(order_id, '21', callback);
    };

    /**
     * 延迟收货
     * @param {string} order_id
     * @param {function} callback
     */
    this.receiving_delay = (order_id, callback = () => {
    }) => {
      order_delay_deal(order_id, '22', callback);
    };

    /**
     * 普通查询，直接调用父类的方法
     * @type {OrderService.list|*}
     */
    const general_list = this.list;

    /**
     *
     * @param params
     * producer -- 生产者（商家|厂商）
     # header -- 拼头
     # consumer -- 消费者（用户、顾客
     # hand_id -- 拼手气ID
     * @param callback
     */
    this.list = (params, callback) => {
      const {producer, header, consumer, hand_id} = params;
      if (producer) {
        this.find_by_producer(params, callback);
      } else if (header) {
        this.find_by_header(params, callback);
      } else if (consumer) {
        this.find_by_consumer(params, callback);
      } else if (hand_id) {
        this.find_by_hand(params, callback);
      } else {
        const keys = ['columns', 'where', 'groupby', 'orderby'];
        if (!params['where']) params['where'] = {};
        for (const key in params) {
          if (!keys.includes(key)) {
            if (params[key])
              params['where'][key] = params[key];
            delete params[key];
          }
        }
        general_list(params, callback);
      }
    };

    /**
     * 根据ID查询订单详情
     * @param id
     * @param callback
     */
    this.findById = (id, callback) => {
      const Order = this.getModel()
      Order.findByPk(id, {
        include: [
          {
            model: SpellHand, association: Order.belongsTo(SpellHand, {foreignKey: 'hand_id'}), // 查拼手气活动信息
            include: [
              {
                model: Goods, association: SpellHand.belongsTo(Goods, {foreignKey: 'goods_id'}), // 查商品信息
                include: [
                  {
                    model: Merchant, association: Goods.belongsTo(Merchant, {foreignKey: 'merchant_id'}), // 查商店信息
                    include: [
                      {
                        model: User,
                        attributes: {exclude: ['open_id']},
                        association: Merchant.belongsTo(User, {foreignKey: 'user_id'}),
                      } // 查卖方信息
                    ]
                  },
                  {model: GoodsUrl, association: Goods.hasMany(GoodsUrl, {foreignKey: 'goods_id'})}, // 查商品图片
                ]
              }
            ]
          },
          {
            model: User,
            attributes: {exclude: ['open_id']},
            association: Order.belongsTo(User, {foreignKey: 'user_id'})
          }, // 查买方信息
          {model: Address, association: Order.belongsTo(Address, {foreignKey: 'addr_id'})}, // 查配送地址
          {
            model: OrderStatus, association: Order.hasMany(OrderStatus, {foreignKey: 'order_id'}), // 查所有状态
            include: [
              {
                model: Status,
                attributes: ['status_name'],
                association: OrderStatus.belongsTo(Status, {foreignKey: 'status_code'})
              } // 查状态名
            ]
          }
        ]
      }).then(data => {
        callback({
          status: 'success',
          data,
        });
      }).catch(err => {
        callback({status: 'failure', message: err.message});
      });
    };

    /**
     * 商家|厂家查询订单
     * @param {number} params 商家|厂家编号
     * @param callback
     */
    this.find_by_producer = (params, callback) => {
      const order_set = {};
      Order.hasMany(OrderStatus, {foreignKey: 'order_id'});
      Order.belongsTo(Address, {foreignKey: 'addr_id'});
      Goods.hasMany(GoodsUrl, {foreignKey: 'goods_id'});
      Merchant.findAll({where: {user_id: params['producer']}}).then(merchants => {
        return Goods.findAll({
          include: [{
            attributes: [['image_url', 'url'], ['image_level', 'level']],
            model: GoodsUrl,
            order: [['image_level', 'asc']]
          }],
          where: {merchant_id: merchants.map(merchant => merchant.merchant_id)}
        });
      }).then(goods_list => {
        order_set['goodses'] = goods_list.reduce((o1, o2) => {
          o1[o2.goods_id] = o2;
          return o1;
        }, {});
        return SpellHand.findAll({
          where: {
            goods_id: goods_list.map(goods => goods.goods_id)
          }
        });
      }).then(spell_hands => {
        order_set['spell_hands'] = spell_hands.reduce((o1, o2) => {
          o1[o2.hand_id] = o2;
          return o1;
        }, {});
        return Order.findAll({
          include: [{
            model: OrderStatus
          }, {
            model: Address
          }], where: {
            hand_id: spell_hands.map(spell_hand => spell_hand.hand_id),
            status: {
              [this.getOp().ne]: '11'
            }
          }, order: [['created_time', 'DESC']]
        });
      }).then(orders => {
        order_set['orders'] = orders;
        return Status.findAll();
      }).then(statuses => {
        order_set['statuses'] = statuses.reduce((m, o) => {
          m[o.status_code] = o;
          return m;
        }, {});

        const hands = order_set['orders'].map(order => order.hand_id);
        const goods_arr = new Array();
        for (const key in order_set['spell_hands']) {
          if (!hands.includes(Number(key))) {
            delete order_set['spell_hands'][key];
          } else {
            const goods_id = order_set['spell_hands'][key]['goods_id'];
            if (!goods_arr.includes(goods_id))
              goods_arr.push(goods_id);
          }
        }
        for (const key in order_set['goodses']) {
          if (!goods_arr.includes(Number(key)))
            delete order_set['goodses'][key];
        }

        callback({status: 'success', data: order_set});
      }).catch(error => callback({status: 'failure', message: error.message}));
    };

    /**
     * 拼头查询订单
     * @param {number}  header 拼头ID
     * @param callback
     */
    this.find_by_header = (header, callback) => {

    };

    /**
     * 用户查询订单
     * @param {k, v} params 用户/客户ID
     * @param callback
     */
    this.find_by_consumer = (params, callback) => {
      const order_set = {};
      Order.hasMany(OrderStatus, {foreignKey: 'order_id'});
      Order.belongsTo(Address, {foreignKey: 'addr_id'});
      Goods.hasMany(GoodsUrl, {foreignKey: 'goods_id'});
      Order.findAll({
        include: [{
          model: OrderStatus
        }, {
          model: Address
        }],
        where: {user_id: params['consumer']},
        // offset: params['offset'] ? params['offset'] : 0,
        // limit: params['limit'] ? params['limit'] : 500,
        order: [['created_time', 'DESC']]
      }).then(orders => {
        order_set['orders'] = orders;
        return SpellHand.findAll({
          where: {
            hand_id: orders.map(order => order.hand_id).reduce((o1, o2) => {
              if (!o1.includes(o2)) o1.push(o2);
              return o1;
            }, [])
          }
        })//.then(spell_hands => spell_hands);
      }).then(spell_hands => {
        order_set['spell_hands'] = spell_hands.reduce((o1, o2) => {
          o1[o2.hand_id] = o2;
          return o1;
        }, {});
        return Goods.findAll({
          include: [{
            attributes: [['image_url', 'url'], ['image_level', 'level']],
            model: GoodsUrl,
            order: [['image_level', 'asc']]
          }],
          where: {
            goods_id: spell_hands.map(spell_hand => spell_hand.goods_id).reduce((o1, o2) => {
              if (!o1.includes(o2)) o1.push(o2);
              return o1;
            }, [])
          }
        })//.then(goods_list => goods_list);
      }).then(goods_list => {
        order_set['goodses'] = goods_list.reduce((o1, o2) => {
          o1[o2.goods_id] = o2;
          return o1;
        }, {});
        return Merchant.findAll({
          where: {
            merchant_id: goods_list.map(goods => goods.merchant_id).reduce((o1, o2) => {
              if (!o1.includes(o2)) o1.push(o2);
              return o1;
            }, [])
          }
        });
      }).then(merchants => {
        order_set['merchants'] = merchants.reduce((o1, o2) => {
          o1[o2.merchant_id] = o2;
          return o1;
        }, {});
        return Status.findAll();
      }).then(statuses => {

        const hands = order_set['orders'].map(order => order.hand_id);
        const goods_arr = new Array();
        for (const key in order_set['spell_hands']) {
          if (!hands.includes(Number(key))) {
            delete order_set['spell_hands'][key];
          } else {
            const goods_id = order_set['spell_hands'][key]['goods_id'];
            if (!goods_arr.includes(goods_id))
              goods_arr.push(goods_id);
          }
        }
        for (const key in order_set['goodses']) {
          if (!goods_arr.includes(Number(key)))
            delete order_set['goodses'][key];
        }

        order_set['statuses'] = statuses.reduce((m, o) => {
          m[o.status_code] = o;
          return m;
        }, {});
        callback({status: 'success', data: order_set});
      }).catch(error => callback({status: 'failure', message: error.message}));
    };

    /**
     * 根据拼手气ID查询订单
     * @param {k, v} params
     * @param callback
     */
    this.find_by_hand = (params, callback) => {
      const orders_set = {};

      SpellHand.belongsTo(Goods, {foreignKey: 'goods_id', as: 'goods'});
      Goods.belongsTo(Merchant, {foreignKey: 'merchant_id'});
      Goods.hasMany(GoodsUrl, {foreignKey: 'goods_id'});
      Order.belongsTo(SpellHand, {foreignKey: 'hand_id'});
      Order.hasMany(OrderStatus, {foreignKey: 'order_id'});
      Order.belongsTo(Address, {foreignKey: 'addr_id'});

      Order.findAll({
        include: [{
          model: SpellHand,
          include: [{
            model: Goods,
            as: 'goods',
            include: [{
              model: Merchant
            }, {
              model: GoodsUrl
            }]
          }]
        }, {
          model: OrderStatus
        }, {
          model: Address
        }],
        where: {
          hand_id: params['hand_id']
        },
        // offset: params['offset'] ? params['offset'] : 0,
        // limit: params['limit'] ? params['limit'] : 20,
        order: [['created_time', 'desc']]
      }).then(orders => {
        orders_set['orders'] = orders.map(order => {
          let order_obj = JSON.parse(JSON.stringify(order));
          delete order_obj['spell_hand'];
          return order_obj;
        });

        orders_set['spell_hands'] = orders.reduce((o1, o2) => {
          let spell_object = JSON.parse(JSON.stringify(o2));
          o1[spell_object['hand_id']] = spell_object['spell_hand'];
          return o1;
        }, {});

        const spell_hands = orders_set['spell_hands'];
        orders_set['goods'] = {};
        for (const key in spell_hands) {
          orders_set['goods'][spell_hands[key]['goods_id']] = spell_hands[key]['goods'];
          delete spell_hands[key]['goods'];
        }

        const goods = orders_set['goods'];
        orders_set['merchants'] = {};
        for (const key in goods) {
          orders_set['merchants'][goods[key]['merchant_id']] = goods[key]['merchant'];
          delete goods[key]['merchant'];
        }
        return Status.findAll();
      }).then(statuses => {
        orders_set['statuses'] = statuses.reduce((m, o) => {
          m[o.status_code] = o;
          return m;
        }, {});
        callback({status: 'success', data: orders_set});
      }).catch(error => callback({status: 'failure', message: error.message}));
    }
  }
}

// const service = new OrderService('order');
// service.list({consumer: 3}, (data) => {
//   console.log(JSON.stringify(data));
// });

module.exports = OrderService;