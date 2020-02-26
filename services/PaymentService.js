const moment = require('moment');
const log4js = require('../commons/Log4jsConfig');
const logger = log4js.getLogger('services.Payment');
const BasicService = require('./BasicService');
const spellHandLuckGo = require('../commons/SpellHandLuckGo');
const OrderStatusService = require('./OrderStatusService');
const orderStatusService = new OrderStatusService('orderStatus');
const {isEmpty} = require('../utils/string.utils');
const SystemConfig = require('../commons/SystemConfig');

const {
  user: User,
  order: Order,
  orderStatus: OrderStatus,
  config: Config,
  spellHand: SpellHand
} = require('../models');

const {
  unifiedorder: wechatpay_payment,
  refund: wechatpay_refund
} = require('../wxpay-api/wxpay');

/**
 * 费用支付处理类
 */
class PaymentService extends BasicService {

  constructor(modelName) {
    super(modelName);

    /**
     *
     * @param {k, v} pay_info
     * @param {function} callback
     */
    this.create = (pay_info, callback) => {
      if (isEmpty(pay_info)) {
        callback({
          status: 'failure',
          messages: '数据不能为空'
        });
        return;
      }

      //获得PAYMENT ID
      this.generate_primary_key().then(pay_id => {

        pay_info['pay_id'] = pay_id;

        return this.getMySQL().transaction(transaction => {
          let title = pay_info.title;
          delete pay_info['title'];
          return this.getModel().create(pay_info, { //创建支付信息
            transaction
          }).then(() => {
            return OrderStatus.create({
              order_id: pay_info.order_id,
              status_code: '01', //等待支付
              reason: `等待付款，参与拼手气购买商品产生的费用`
            }, {
              transaction
            });
          }).then(() => {
            return User.findByPk(pay_info.user_id, {
              attributes: ['open_id']
            }, {
              transaction
            });
          }).then(user => {
            return Config.findOne({where: {item_name: 'payment_wait_duration'}}, {transaction}).then(config => {
              return {user: user, config: config};
            });
          }).then(result => {
            wechatpay_payment({
              body: title,
              out_trade_no: pay_info['order_id'],
              total_fee: pay_info['pay_charge'],
              openid: result.user.open_id,
              time_expire: moment(Date.now() + result.config.item_value * 60000).format('YYYYMMDDHHmmss')
            }, {
              fail: error => {
                throw error
              },
              success: result => callback({
                status: 'success',
                data: result
              })
            })
          }).catch(error => {
            throw error;
          });
        }).catch(error => {
          throw error;
        });
      }).catch(error => {
        callback({
          status: 'failure',
          message: error.message
        })
      });
    };

    /**
     * 支付请求
     * @param {k, v} payment_info 支付信息
     * @param {function} callback 回调函数
     */
    this.payment_request = (payment_info, callback = () => {
    }) => {
      wechatpay_payment(payment_info, {
        fail: error => callback({status: 'failure', message: error}),
        success: result => callback({status: 'success', data: result})
      })
    };
    /**
     * 支付通知
     * @param {any} notify 付款结果
     * @param {function} callback 回调函数
     */
    this.payment_notify = (notify, callback = () => {
    }) => {
      // console.log(results);
      const order_status_info = {};
      order_status_info['order_id'] = notify['out_trade_no'];
      if (notify['return_code'] === 'SUCCESS') {
        order_status_info['status_code'] = '20';
        order_status_info['reason'] = '支付成功, 成功加入拼手气';
      } else {
        order_status_info['status_code'] = '11';
        order_status_info['reason'] = notify['result_msg'];
      }
      orderStatusService.create(order_status_info, result => {
        if (result.status === 'success') {
          const order_status = result.data;
          if (notify['return_code'] === 'SUCCESS') {
            //检查拼手气活动是否已经满足结束的条件
            check_spellhand_by_orderstatus(order_status);
          } else {
            //订单回滚
            orderStatusService.order_rollback(order_status['order_id'], '11', notify['result_msg']);
          }
        }
      });
    };

    /**
     * 退款
     * @param {{out_trade_no: *, total_fee: *, refund_fee: *}} refund_info 退款信息,
     * @param {function} callback 回调函数
     */
    this.refund_request = (refund_info, callback = () => {
    }) => {
      this.generate_primary_key().then(payment_id => {
        this.getModel().findOne({
          attributes: ['order_id', 'hand_id', 'user_id'],
          where: {
            order_id: refund_info['out_trade_no']
          }
        }).then(payment => {
          return this.getModel().create({
            pay_id: payment_id,
            order_id: payment['order_id'],
            hand_id: payment['hand_id'],
            user_id: payment['user_id'],
            pay_charge: refund_info['refund_fee'],
            pay_type: refund_info['pay_type']
          });
        }).then(payment => {
          if (refund_info['pay_type'])
            delete refund_info['pay_type'];
          refund_info['out_refund_no'] = payment['pay_id'];
          wechatpay_refund(refund_info, {
            fail: error => callback({
              status: 'failure',
              message: error
            }),
            success: () => callback({
              status: 'success',
              message: '退款成功'
            })
          })
        });
      }).catch(error => callback({
        status: 'failure',
        message: error.message
      }));
    };

    /**
     * 退款通知
     * @param {any} notify 退款结果
     * @param {function} callback 回调函数
     */
    this.refund_notify = (notify, callback = () => {
    }) => {
      // console.log(notify);
      if (notify['return_code'] === 'SUCCESS' && notify['refund_status'] === 'SUCCESS') {
        logger.info('退款成功，更新订单状态为"已退款"');
        const order_status_info = {};
        order_status_info['order_id'] = notify['out_trade_no'];
        order_status_info['status_code'] = '31';
        order_status_info['reason'] = '普通退款';
        orderStatusService.create(order_status_info, callback);
      }
    };

    /***
     * 根据拼手气ID进行退款
     * @param {number} spellhand 拼手气
     * @param {function} callback 回调函数
     */
    this.refund_by_spellhand = (spellhand, callback = () => {
    }) => {
      const where = {
        hand_id: spellhand.hand_id,
        pay_type: 1
      };
      const Payment = this.getModel();
      Payment.belongsTo(Order, {foreignKey: 'order_id'});
      Payment.belongsTo(User, {foreignKey: 'user_id'});
      Payment.findAll({
        where: where,
        include: [{
          model: Order,
          required: true,
          attributes: ['order_id', 'charge'],
          where: {
            status: '20'
          }
        }, {
          model: User,
          required: true,
          attributes: ['open_id']
        }]
      }).then(payments => {
        payments.map(payment => {
          this.refund_request({
            out_trade_no: payment.order_id,
            total_fee: payment.pay_charge,
            refund_fee: payment.pay_charge,
            refund_desc: `拼手气【${spell.hand_id}】活动失败退款`
          }, result => {
          });
        });
        callback({status: 'success', data: payments});
      }).catch(error => console.log(error));
    };

    /**
     * 根据订单进行退款
     * @param {number} order_id 订单ID
     */
    this.refund_by_order = (order_id) => {

      this.getModel().findOne({
        where: {
          order_id: order_id,
          pay_type: 1
        }
      }).then(payment => {
        this.refund_request({
          out_trade_no: order_id,
          total_fee: payment.pay_charge,
          refund_fee: payment.pay_charge
        });
      });
    };

    /**
     *
     * @param {k,v} order_status 订单状态对象
     * 检查拼手气是否已经满足结束条件，如果满足条件
     */
        // this.check_spellhand_by_orderstatus = (order_status) => {
    const check_spellhand_by_orderstatus = (order_status) => {
          Order.findOne({
            attributes: ['hand_id'],
            where: {
              order_id: order_status['order_id']
            }
          }).then(order => {
            return Order.findOne({
              attributes: ['hand_id', [this.getMySQL().fn('COUNT', this.getMySQL().col('order_id')), 'payed_order_cnt']],
              where: {
                hand_id: order['hand_id'],
                status: order_status['status_code']
              },
            });
          }).then(order => {
            const {hand_id, payed_order_cnt} = order.dataValues;
            return SpellHand.findOne({
              attributes: ['hand_id', 'goods_id', 'person_num', 'end_time', 'free_num', 'user_id', 'start_time', [this.getMySQL().fn('NOW'), 'now_time']],
              where: {
                hand_id: hand_id
              }
            }).then(spell_hand => {
              spell_hand.dataValues['payed_order_cnt'] = payed_order_cnt;
              return spell_hand;
            })
          }).then(spell_hand => {
            const {person_num, end_time, now_time, payed_order_cnt} = spell_hand.dataValues;
            if (end_time > now_time && person_num <= payed_order_cnt) {
              spell_hand['finish_time'] = this.getMySQL().fn('NOW');
              spell_hand.save().then(spell => {
                SpellHand.findByPk(spell['hand_id']).then(spellhand => {
                  const refund_status = SystemConfig.get_property('luck_order_refund_status');
                  spellHandLuckGo.spell_luck_go(spellhand, true, refund_status, result => {
                    // const lucky_users = result['lucky_users'];
                    // console.log(lucky_users)
                    // if (lucky_users) {
                    //   lucky_users.forEach(lucky_user => {
                    //     this.refund_request({
                    //       out_trade_no: lucky_user['order_id'],
                    //       total_fee: lucky_user["total_fee"],
                    //       refund_fee: lucky_user["refund_fee"],
                    //       refund_desc: '活动优惠，中奖金额',
                    //       pay_type: "2"
                    //     }, r => console.log(r))
                    //   });
                    // }
                  });
                });
              });
            }
          });
        };
  }
}

module.exports = PaymentService;