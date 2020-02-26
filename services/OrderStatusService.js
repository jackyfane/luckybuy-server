const BasicService = require('./BasicService');
const { isEmpty } = require('../utils/string.utils');
const { goods: Goods, spellHand: SpellHand, order: Order, merchant: Merchant, user: User, address: Address } = require('../models');
const { get: get_form_id } = require("./UserFormIdService")
const {
  // customSend4merchantSend, customSend4consumerReceive,
  tmplSend4merchantSend, tmplSend4consumerReceive,
} = require("../wxmsg-api/WxMsg")

/**
 * 订单状态业务处理类
 */
class OrderStatusService extends BasicService {
  constructor(modelName) {
    super(modelName);

    const create = this.create
    this.create = (params, callback) => {
      const { order_id, status_code } = params
      create(params, ret => {
        callback(ret)
        if (ret.status == 'success' && ['22', '23'].includes(status_code)) {
          const OrderStatus = this.getModel()
          OrderStatus.findOne({ // 查订单当前状态信息
            where: { order_id, status_code },
            include: [
              {
                model: Order, association: OrderStatus.belongsTo(Order, { foreignKey: 'order_id' }), // 查订单信息
                include: [
                  {
                    model: SpellHand, association: Order.belongsTo(SpellHand, { foreignKey: 'hand_id' }), // 查拼手气活动信息
                    include: [
                      {
                        model: Goods, association: SpellHand.belongsTo(Goods, { foreignKey: 'goods_id' }), // 查商品信息
                        include: [
                          {
                            model: Merchant, association: Goods.belongsTo(Merchant, { foreignKey: 'merchant_id' }), // 查商店信息
                            include: [
                              { model: User, association: Merchant.belongsTo(User, { foreignKey: 'user_id' }), } // 查卖方信息
                            ]
                          }
                        ]
                      }
                    ]
                  },
                  { model: User, association: Order.belongsTo(User, { foreignKey: 'user_id' }) }, // 查买方信息
                  { model: Address, association: Order.belongsTo(Address, { foreignKey: 'addr_id' }) }, // 查配送地址
                ]
              }
            ]
          }).then(order_status => {
            const { created_time: cr_dtm,
              spell_order: { goods_num, free_num, delivery, hand_id,
                spell_hand: { good: { goods_name, goods_desc, promote_price, merchant: { merchant_name: shop, merchant_phone: shop_phone_num, user: seller } } },
                user: buyer, address: addr, created_time: buy_dtm
              } } = order_status
            const [touser_id, tsf, opt, at] = status_code == '22' ? [ // 待收货(商家发货)
              buyer.user_id, tmplSend4merchantSend, {
                touser: buyer.open_id,
                order_id,
                goods_name,
                goods_num,
                snd_dtm: cr_dtm,
                buy_dtm,
                seller: seller.user_name || seller.weixin_name,
                shop,
                receiver: delivery == '到店自提' ? (buyer.user_name || buyer.weixin_name) : addr.receiver,
                //  rcv_code: ?
              }, '通知拼客商家已发货'
            ] : [ // 完成(拼客收货)
                seller.user_id, tmplSend4consumerReceive, {
                  touser: seller.open_id,
                  order_id,
                  goods_name,
                  goods_desc,
                  cost: `${(goods_num * promote_price / 100).toFixed(2)}元${free_num > 0 ? `-免单额${(free_num * promote_price / 100).toFixed(2)}元` : ''}`,
                  receiver: delivery == '到店自提' ? (buyer.user_name || buyer.weixin_name) : addr.receiver,
                  rcv_dtm: cr_dtm,
                  rcv_phone_num: delivery == '到店自提' ? buyer.phone_num : addr.phone_num
                }, '通知商家拼客已收货'
              ]
            const f = () => get_form_id(touser_id, form_id => {
              // 成功获取form_id，即可推送消息
              if (form_id) tsf({
                form_id, ...opt, fail: err => {
                  console.error(at + '，消息推送失败：' + JSON.stringify(err))
                  // 若是form_id导致的失败，再一次获取form_id并推送通知消息
                  if (['41028', '41029'].includes(err.errcode)) f()
                }
              })
            })
            f()
          }).catch(err => console.error(err))

        }
      })
    }

    /**
     * 批量创建
     */
    this.bulk_create = (records, callback) => {
      if (isEmpty(records)) {
        callback({
          status: 'failure',
          message: '数据为空！'
        });
        return;
      }
      this.getModel().bulkCreate(records)
        .then(rows => callback({ status: 'success', data: rows }))
        .catch(error => callback({ status: 'failure', message: error.message }));
    };

    /**
     * 根据拼手气ID创建订单状态
     * @param {number} hand_id 拼手气ID
     * @param {string} curr_status 订单当前状态
     * @param {string} target_status 目标状态
     * @param {string} reason 创建状态的原因
     * @param {function} callback 回调函数
     */
    this.create_by_spellhand = (hand_id, curr_status, target_status, reason, callback = () => {
    }) => {
      Order.findAll({
        attributes: ['order_id', 'status'], where: {
          hand_id: hand_id,
          status: curr_status
        }
      }).then(orders => {
        const order_status_list = orders.map(order => ({
          order_id: order.order_id,
          status_code: target_status,
          reason: reason
        }));
        this.bulk_create(order_status_list, callback);
      }).catch(error => callback({ status: 'failure', message: error.message }));
    };

    /**
     *
     * @param order_id
     * @param curr_status
     * @param target_status
     * @param reason
     * @param callback
     */
    this.create_by_order = (order_id, curr_status, target_status, reason, callback = () => {
    }) => {

    };

    /**
     * 订单回滚
     * @param {number} order_id 订单ID
     * @param {string} status 订单状态
     * @param {string} reason 原因
     * @param {function} callback 回调函数
     */
    this.order_rollback = (order_id, status, reason, callback = () => {
    }) => {
      this.getMySQL().transaction(transaction => {
        let goods_num = 0;
        return Order.findByPk(order_id, { transaction }).then(order => {
          goods_num = order['goods_num'];
          return SpellHand.findOne({
            where: {
              hand_id: order['hand_id']
            }
          }).then(spell_hand => {
            spell_hand.spelled_num -= 1;
            return spell_hand.save();
          });
        }).then(spell_hand => {
          return Goods.findOne({
            where: {
              goods_id: spell_hand['goods_id']
            }
          }, {
              transaction
            }).then(goods => {
              goods.saled_number -= goods_num;
              return goods.save({ transaction });
            });
        }).then(() => {
          this.getModel().create({
            order_id: order_id,
            status: status,
            reason: reason
          }, { transaction });
        });
      }).then(() => callback({ status: 'success', message: 'SUCCESS' })
      ).catch(error => callback({ status: 'failure', message: error.message }));
    }
  }
}


module.exports = OrderStatusService;