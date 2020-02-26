const BasicService = require('./BasicService');
const { commonMySQL: MySQL } = require('../commons/mysql');

/**
 * 拼手气费用明细业务处理
 */
class FeeDetailService extends BasicService {
  constructor(modelName) {
    super(modelName);

    /** 商家/拼头入账明细: 查看详细数据记录：活动、销售、分成、手续费等 */
    this.item_fee = ({ fid }, cb = obj => { }) => {
      MySQL.query('SELECT f.detail_id,f.hand_id,f.total_cost,f.header_fee,f.wechat_fee,f.sp_fee,f.discount_fee,f.merchant_fee'
        + ", DATE_FORMAT(f.created_time,'%Y-%m-%d %H:%i:%s') AS ctime, DATE_FORMAT(f.updated_time,'%Y-%m-%d %H:%i:%s') AS utime"
        + ',sh.spelled_num,sh.free_num,g.goods_id,g.goods_name,g.come_price,g.promote_price,g.expect_min_profit AS er,'
        + "COALESCE(g.commission_rate,(SELECT s.item_value*1 FROM system_config s WHERE s.item_name='commission_min_rate')) AS cr,"
        + "COALESCE(g.poundage_rate,(SELECT s.item_value*1 FROM system_config s WHERE s.item_name='poundage_rate')) AS pr"
        + ' FROM fee_detail f LEFT JOIN spell_hand sh ON sh.HAND_ID=f.hand_id LEFT JOIN goods g ON g.goods_id=sh.goods_id'
        + ' WHERE f.detail_id=$1',
        { bind: [fid], type: MySQL.QueryTypes.SELECT }
      ).then(list => {
        cb({ status: 'success', data: list.length > 0 ? list[0] : {} })
      }).catch(err => { cb({ status: 'failure', message: err.message }) })
    }

  }
}

module.exports = FeeDetailService;