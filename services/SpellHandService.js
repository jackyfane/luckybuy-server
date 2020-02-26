const BasicService = require('./BasicService');
const {goods: Goods, user: User} = require('../models');

/**
 * 拼手气业务处理类
 */
class SpellHandService extends BasicService {

  constructor(modelName) {
    super(modelName);

    /**
     * 根据商家或商品查询
     * @param {k, v} params
     * @param {function} callback
     */
    this.list_by_mg = (params, callback) => {
      this.getModel().belongsTo(User, {foreignKey: 'user_id'});
      this.getModel().belongsTo(Goods, {foreignKey: 'goods_id'});
      let where = {};
      if (params['goods_id']) {
        where = {
          include: [{
            model: User,
            attributes: ['user_id', 'weixin_name', 'avatar_url', 'user_name', 'country', 'province', 'city']
          }],
          where: {
            goods_id: params['goods_id'],
          },
          offset: params['offset'] ? params['offset'] : 0,
          limit: params['limit'] ? params['limit'] : 20,
          order: [['created_time', 'desc']]
        }
      } else if (params['merchant_id']) {
        where = {
          include: [{
            model: User,
            attributes: ['user_id', 'weixin_name', 'avatar_url', 'user_name', 'country', 'province', 'city']
          }, {
            model: Goods,
            attributes:[],
            where: {
              merchant_id: params['merchant_id']
            }
          }],
          offset: params['offset'] ? params['offset'] : 0,
          limit: params['limit'] ? params['limit'] : 20,
          order: [['created_time', 'desc']]
        }
      }

      this.getModel().findAll(where).then(activities => callback(extract(activities))).catch(error => callback({
        status: 'failure',
        message: error.message
      }));
    };

    /**
     *
     * @param activities
     */
    const extract = (activities) => {

      const spell_hands = activities.map(activity => {
        let obj = JSON.parse(JSON.stringify(activity));
        delete obj['user'];
        return obj;
      });

      //提取商品信息
      // const goodses = spell_hands.reduce((o1, o2) => {
      //   o1[o2['goods_id']] = o2['goods'];
      //   delete o2['goods'];
      //   return o1;
      // }, {});
      //
      // const merchants = {};
      // for (let key in goodses) {
      //   merchants[goodses[key]['merchant_id']] = goodses[key]['merchant'];
      //   delete goodses[key]['merchant'];
      // }

      const headers = activities.reduce((o1, o2) => {
        o1[o2['user_id']] = o2['user'];
        return o1;
      }, {});

      return {status: 'success', data:{spell_hands: spell_hands, headers: headers}}
    }
  }
}

module.exports = SpellHandService;