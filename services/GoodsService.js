const BasicService = require('./BasicService');
const { goods: Goods, merchant: Merchant, goodsUrl: GoodsUrl, spellHand: SpellHand } = require('../models/');
const { commonMySQL: MySQL } = require('../commons/mysql');
const { Op } = require("sequelize");

/**
 * 商品业务处理类
 */
class GoodsService extends BasicService {
  constructor(modelName) {
    super(modelName);

    /**
     * 商家查询商品信息
     * @param {k,v} params
     * @param {function} callback
     */
    this.list_by_merchant = (params, callback) => {
      Goods.belongsTo(Merchant, { foreignKey: 'merchant_id' });
      Goods.hasMany(GoodsUrl, { foreignKey: 'goods_id' });
      Goods.findAll({
        attributes: ['goods_id', 'goods_name', 'merchant_id', 'cat_id', 'goods_number', 'saled_number',
          // [commonMySQL.literal('(SELECT image_url FROM goods_url gu WHERE gu.goods_id = goods.goods_id LIMIT 1)'), 'image_url'],
          [MySQL.literal('(SELECT count(1) FROM spell_hand sh WHERE sh.goods_id = goods.goods_id)'), 'spell_cnt']
        ],
        include: [{
          model: Merchant,
          where: {
            user_id: params['user_id']
          }
        }, {
          model: GoodsUrl,
          attributes: ['image_url']
        }],
        order: [[MySQL.col('spell_cnt'), 'desc'], ['goods_id']]
      }).then(goodsList => {
        const goods_list = JSON.parse(JSON.stringify(goodsList));
        const merchants = goods_list.reduce((g1, g2) => {
          g1[g2['merchant_id']] = g2['merchant'];
          delete g2['merchant'];
          return g1;
        }, {});
        callback({ status: 'success', data: { goodses: goods_list, merchants: merchants } });
      }).catch(error => {
        callback({ status: 'failure', message: error.message });
      });
    }

    /** 查询正在进行的活动 */
    this.spelling = ({ goods_id }, cb = data => { }) => {
      SpellHand.findAll({
        where: {
          goods_id,
          start_time: { [Op.lte]: MySQL.fn('NOW') },
          end_time: { [Op.gt]: MySQL.fn('NOW') },
          finish_time: { [Op.eq]: null },
          // person_num: { [Op.gt]: MySQL.col('spelled_num') }
        },
        order: [['end_time', 'ASC']]
      }).then(data => cb({ status: 'success', data })).catch(err => cb({ status: 'failure', message: err.message }))
    }

  }
}

module.exports = GoodsService;