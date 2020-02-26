const SpellSaleModel = require('./SpellSaleModel');
const systemConfig = require('./SystemConfig');

const {
  order: Order,
  goods: Goods,
  payment: Payment,
  user: User,
  feeDetail: FeeDetail,
  spellHand: SpellHand,
  merchant: Merchant
} = require('../models');

const AcctHeaderService = require('../services/AcctHeaderService');
// const AcctMerchantService = require('../services/AcctMerchantService');
const acctHeaderService = new AcctHeaderService('headerAcct');
// const acctMerchantService = new AcctMerchantService('merchantAcct');

const {
  isEmpty
} = require('../utils/string.utils');
const log4js = require('./Log4jsConfig');
const logger = log4js.getLogger('commons.SpellHandLuckGo');

const {get: get_form_id} = require("../services/UserFormIdService")
const {tmplSend4merchantToSend} = require("../wxmsg-api/WxMsg")

/**
 * 拼手气抽奖：
 * 根据拼手气信息，提取用户信息，包括订单信息和支付信息，
 * 通过以上提取的数据，进行抽奖并确认获奖用户和获奖金额
 */
class SpellHandLuckGo {

  /**
   * 构造器
   */
  constructor() {

    // this.spell_hand = {};
    // this.order_status = '';

    /**
     * 分解用户订单支付信息
     * @param {User} users
     * @returns {{orders_array: any[], orders_payments, sale_total: number}}
     */
    const decompose_joined_users = (hand_id, users) => {
      let sale_total = 0;
      const orders_array = []; //订单ID数组
      const payments = []; //用户支付信息
      for (const user of users) {
        user['spell_orders'].forEach(order => {
          const amount = order.goods_num;
          sale_total += amount;
          for (let i = 0; i < amount; i++) {
            orders_array.push(order.order_id);
          }
          payments.push({
            hand_id: hand_id,
            user_id: user.user_id,
            order_id: order.order_id,
            pay_id: order.payments[0].pay_id,
            total_fee: order.payments[0].pay_charge,
            refund_fee: order.payments[0].pay_charge,
          });
        });
      }
      return {
        sale_total,
        orders_array,
        payments
      };
    };

    /**
     * 随机抽奖
     * @param {any[]} orders 订单编号
     * @param {number} free_cnt 免单数
     */
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

    /**
     * 根据订单映射中奖用户以及确定返还金额
     * @param {Object} user_payments  用户支付信息
     * @param {Object} lucky_orders 幸运订单
     * @param {Number} price 促销价
     */
    const mapping_users_for_lucky_orders = (lucky_orders, user_payments, price) => {
      if (isEmpty(lucky_orders)) return;
      const lucky_users = [];
      //计算免费金额
      user_payments.forEach(up => {
        if (lucky_orders[up.order_id]) {
          lucky_users.push({
            order_id: up.order_id,
            free_num: lucky_orders[up.order_id],
            total_fee: up.total_fee,
            refund_fee: lucky_orders[up.order_id] * price
          });
        }
      });
      return lucky_users;
    };

    /**
     * 商品信息
     * @returns {Promise}
     */
    const get_goods = (spell_hand) => {
      return Goods.findOne({
        where: {
          goods_id: spell_hand['goods_id']
        }
      });
    };

    /**
     * 获取成功参与拼手气的用户信息，包含订单、支付信息
     * @returns {Promise}
     */
    const spell_users = (spell_hand, order_status) => {
      User.hasMany(Order, {
        foreignKey: 'user_id'
      });
      Order.hasMany(Payment, {
        foreignKey: 'order_id'
      });
      return User.findAll({
        attributes: ['user_id', 'open_id'],
        include: [{
          model: Order,
          attributes: ['order_id', 'goods_num'],
          where: {
            status: order_status,
            hand_id: spell_hand['hand_id']
          },
          include: [{
            model: Payment,
            attributes: ['pay_id', 'pay_charge'],
            where: {
              hand_id: spell_hand['hand_id'],
              pay_type: 1
            }
          }]
        }]
      });
    };

    /**
     * 根据拼手气活动ID查询拼头和商家
     * @param {number} hand_id
     * @param {function} callback
     */
    this.find_header_merchant = (hand_id, callback) => {
      Merchant.hasMany(Goods, {
        foreignKey: 'merchant_id'
      });
      Goods.hasMany(SpellHand, {
        foreignKey: 'goods_id'
      });
      Merchant.findOne({
        attributes: [
          ['user_id', 'merchant']
        ],
        include: [{
          attributes: ['goods_id'],
          model: Goods,
          include: [{
            model: SpellHand,
            attributes: [
              ['user_id', 'header']
            ],
            where: {
              hand_id: hand_id
            }
          }]
        }]
      }).then(result => {
        logger.info('=================查询商家和拼头信息成功=================');
        const obj = JSON.parse(JSON.stringify(result));
        callback({
          status: 'success',
          data: {
            merchant: obj["merchant"],
            header: obj['goods'][0]['spell_hands'][0]['header']
          }
        });
      }).catch(error => {
        callback({
          'status': 'success',
          data: error.message
        });
      });
    };

    /**
     * 保存费用明细
     * @param fee_detail_info
     */
    const save_fee_detail = (fee_detail_info) => {
      FeeDetail.create({
        hand_id: fee_detail_info['hand_id'],
        total_cost: fee_detail_info['total_cost'],
        header_fee: fee_detail_info['commission'],
        sp_fee: fee_detail_info['poundage'],
        merchant_fee: fee_detail_info['income'],
        discount_fee: fee_detail_info['discount_fee']
      }).then(() => {
        logger.info('交易费用明细创建成功, 更新账户信息');
        this.find_header_merchant(fee_detail_info['hand_id'], _result => {
          if (_result['status'] === 'success') {
            const data = _result['data'];
            //拼头提成
            acctHeaderService.create({
              user_id: data['header'],
              total_amount: fee_detail_info['commission']
            }, (result) => {
              logger.info('=================拼头提成入账成功=================');
              if (result['status'] === 'success') {
                acctHeaderService.withdraw({
                  withdraw_from: 'account_header',
                  withdraw_to: data['header'],
                  withdraw_amount: fee_detail_info['commission'],
                  desc: '发起拼手气【拼号：' + fee_detail_info['hand_id'] + '】获得的佣金'
                });
              }
            });
            //商家收入，订单完成之后，才入账，在MySQL定时器中实现
            // acctMerchantService.create({
            //   user_id: data['merchant'],
            //   total_amount: fee_detail_info['income']
            // }, (result) => {
            //   if (result['status'] === 'success')
            //     logger.info('=================商家收入入账成功=================');
            // });
          }
        });
      }).catch(error => {
        logger.error('交易费用明细创建失败: ', error);
      });
    };


    /**
     * 更新订单免费数
     * @param lucky_users
     */
    const update_order_free_num = (lucky_users) => {
      if (!isEmpty(lucky_users)) {
        for (let i = 0; i < lucky_users.length; i++) {
          const lucky_user = lucky_users[i];
          Order.update({
            free_num: lucky_user['free_num']
          }, {
            where: {
              order_id: lucky_user['order_id']
            },
          }).then(() => {

            logger.info(`订单【${lucky_user['order_id']}】获得减免【${lucky_user['refund_fee'] / 100}】元`);
          });
        }
      }
    };

    /**
     * 更新拼手气活动状态为已抽奖
     */
    const update_spell_status = (hand_id, free_num) => {
      SpellHand.update({
        free_num: free_num,
        status: free_num <= 0 ? 0 : 100 // 0:无免费活动，100:待派奖
      }, {
        where: {
          hand_id: hand_id
        }
      }).then(() => {
        logger.info(`拼手气【编号：${hand_id}】完成抽奖`);
      });
    };

    /**
     * @param {SpellHand} spell_hand 拼手气活动信息
     * @param {boolean} is_draw 是否进行抽奖
     * @param {string} order_status 订单状态
     * @param {Function} callback
     */
    this.spell_luck_go = (spell_hand, is_draw, order_status, callback) => {
      if (isEmpty(spell_hand)) {
        logger.warn("........拼手气不存在......");
        return;
      }
      if (order_status === '' || order_status === undefined) {
        logger.warn('订单状态不能为空');
        return;
      }
      get_goods(spell_hand).then(goods => {
        spell_users(spell_hand, order_status).then(users => {
          //解析用户
          const {
            sale_total,
            orders_array,
            payments
          } = decompose_joined_users(spell_hand['hand_id'], users);
          if (!is_draw) {
            callback({
              sale_total: sale_total,
              users_payments: payments
            });
          } else {
            //实例化拼手气计算模型
            let poundage_rate = goods.poundage_rate
            if (poundage_rate == null || poundage_rate == '' || poundage_rate == undefined)
              poundage_rate = systemConfig.get_property('poundage_rate');
            poundage_rate = poundage_rate * 1.0;

            const spellSaleModel = new SpellSaleModel(goods.come_price, goods.promote_price, goods.expect_min_profit * 1, goods.commission_rate * 1, poundage_rate);
            spellSaleModel.set_sale_cnt(sale_total).set_free_cnt(spell_hand['free_num']);
            //拼手气费用明细
            const fee_details = spellSaleModel.values_cur();
            //抽奖、确定中奖订单
            const lucky_orders = orders_ernie(orders_array, fee_details.free_cnt);
            //根据中奖订单映射用户
            const lucky_users = mapping_users_for_lucky_orders(lucky_orders, payments, goods.promote_price);
            //存储费用明细信息
            fee_details['total_cost'] = fee_details['sale_sum']; //总销售额
            fee_details['discount_fee'] = fee_details.free_cnt * goods.promote_price;
            fee_details['hand_id'] = spell_hand['hand_id'];
            save_fee_detail(fee_details);
            //更新免单数
            update_order_free_num(lucky_users);
            //更新拼手气状态
            update_spell_status(spell_hand['hand_id'], spellSaleModel.free_cnt);

            //回调函数
            if (callback) {
              callback({
                payments: payments,
                fee_details: fee_details,
                lucky_users: lucky_users
              });
            }

            // 抽奖完成后，推送相关通知
            User.findByPk(spell_hand.user_id).then(header => { // 拼头
              Merchant.findByPk(goods.merchant_id,
                  {
                    include: [
                      {model: User, association: Merchant.belongsTo(User, {foreignKey: 'user_id'}),} // 查卖方信息
                    ]
                  }).then(({user: seller}) => {
                const opt = {
                  touser: seller.open_id,
                  hand_id: spell_hand.hand_id,
                  goods_name: goods.goods_name,
                  header: header.user_name || header.weixin_name,
                  reward: `团长(拼头)获得佣金 ${(fee_details.commission / 100).toFixed(2)}元`,
                  start_time: spell_hand.start_time,
                  person_num: spell_hand.person_num,
                  finish_time: spell_hand.finish_time,
                  discounts: fee_details.free_cnt > 0 ? `获得免单的有${fee_details.free_cnt}件(总销售${fee_details.sale_cnt}件)` : '<无>'
                }
                const f = () => get_form_id(seller.user_id, form_id => {
                  // 成功获取form_id，即可推送消息
                  if (form_id) tmplSend4merchantToSend({
                    form_id, ...opt, fail: err => {
                      console.error('通知商家拼手气活动成功，消息推送失败：' + JSON.stringify(err))
                      // 若是form_id导致的失败，再一次获取form_id并推送通知消息
                      if (['41028', '41029'].includes(err.errcode)) f()
                    }
                  })
                })
                f()
              }).catch(error => logger.error(error))
            }).catch(error => logger.error(error))
          }
        }).catch(error => logger.error(error));
      }).catch(error => logger.error(error));
    };
  }
}

module.exports = new SpellHandLuckGo();