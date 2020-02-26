
/** 最低平台手续费(=微信支付费率6‰) */
const poundage_rate_min = 6 / 1000

/** 拼手气销售参数模型 */
class SpellSaleModel {
  /**
   * 拼手气计算模型
   * @param {number} price0 进价(单位:分)
   * @param {number} price1 售价(单位:分)
   * @param {number} expect_rate 商家期望的最终收益率=(销售实额(=总销售额-免单额)-拼头佣金-平台手续费-成本)/成本
   * @param {number} commission_rate 佣金率，拼头佣金=销售实额*佣金率
   * @param {number} poundage_rate 平台手续费率(>=微信支付费率6‰)，平台手续费=销售实额*平台手续费率
   * @param {number} free_max_def 默认的最高免单数(单位:件)
   */
  constructor(price0, price1, expect_rate, commission_rate, poundage_rate = poundage_rate_min, free_max_def = 0) {
    // 参数:
    // /** 单件利率 */
    // const pr = (price1 - price0) / price0
    /** 期望利率 */
    const er = expect_rate
    /** 佣金率 */
    const cr = commission_rate
    /** 平台手续费率(>=微信支付费率6‰) */
    const sr = Math.max(poundage_rate, poundage_rate_min)
    /** =1-cr-sr */
    const _1csr = 1 - cr - sr
    /** =price1*(1-cr-sr) */
    const _p1_csr = price1 * _1csr
    /** =price0*(1+er) */
    const _p0er = price0 * (1 + er)
    /** 收益均差: 只有在大于0时才能正常计算出最高免单数, 计算公式=(price1*(1-cr-sr))-(price0*(1+er)) */
    const _p1_csr_p0er = Math.max(_p1_csr - _p0er, 0)
    /** 是否可拼 */
    this.can_spell = _p1_csr_p0er > 0

    // 属性:
    /** 最高免单数(单位:件) */
    this.free_max = 0
    /** 当前免单数(单位:件) */
    this.free_cnt = 0
    /** 当前销量(单位:件) */
    this.sale_cnt = 0

    // 方法:
    /**
     * 设置最高免单数，恰当调整当前免单数，并依此算出并更新必需的销量
     * @param {number} max 最高免单数
     */
    this.set_free_max = (max = this.free_max) => {
      if (this.free_max != max) {
        this.free_max = max
        if (this.free_cnt > max) this.free_cnt = max
        this.sale_cnt = Math.max(Math.ceil(max * _p1_csr / _p1_csr_p0er), this.sale_cnt)
      }
      return this
    }
    if (free_max_def >= 1) this.set_free_max(free_max_def)
    /** 设置当前免单数 */
    this.set_free_cnt = (free = this.free_cnt) => {
      if (this.free_cnt != free) {
        if (free < 0) this.free_cnt = this.free_max
        else {
          this.free_cnt = free
          if (free > this.free_max) this.set_free_max(free)
        }
      }
      return this
    }
    /**
     * 设置当前销量，并依此算出并更新允许的最高免单数
     * @param {number} cnt 当前销量
     */
    this.set_sale_cnt = (cnt = this.sale_cnt) => {
      if (this.sale_cnt != cnt) {
        this.sale_cnt = cnt
        this.set_free_max(Math.floor(cnt * _p1_csr_p0er / _p1_csr))
        // this.free_max = Math.floor(cnt * _p1_csr_p0er / _p1_csr)
      }
      return this
    }
    // this.set_sale_cnt()
    /** 成本总额(单位:分) */
    this.cost_sum = () => this.sale_cnt * price0
    /** 销售总额(单位:分) */
    this.sale_sum = () => (this.sale_cnt - this.free_cnt) * price1
    /** 拼头佣金(单位:分) */
    this.commission = () => Math.floor(this.sale_sum() * cr)
    /** 平台手续费(含微信支付费率6‰,单位:分) */
    this.poundage = () => Math.ceil(this.sale_sum() * sr)
    /** 商家收入(单位:分) */
    // this.income = () => Math.floor(this.sale_sum() * _1csr)
    this.income = () => this.sale_sum() - this.commission() - this.poundage()

    /** 所有当前数据 */
    this.values_cur = () => {
      const cost_sum = this.cost_sum()
      const sale_sum = this.sale_sum()
      const commission = Math.floor(sale_sum * cr)
      const poundage = Math.ceil(sale_sum * sr)
      return {
        /** 最高免单数(单位:件) */
        free_max: this.free_max,
        /** 当前免单数(单位:件) */
        free_cnt: this.free_cnt,
        /** 当前销量(单位:件) */
        sale_cnt: this.sale_cnt,
        /** 成本总额(单位:分) */
        cost_sum,
        /** 销售总额(单位:分) */
        sale_sum,
        /** 拼头佣金(单位:分) */
        commission,
        /** 平台手续费(含微信支付费率6‰,单位:分) */
        poundage,
        /** 商家收入(单位:分) */
        income: sale_sum - commission - poundage
      }
    }

  }

}

module.exports = SpellSaleModel

// 测试:
// const an_fn = (m_data = new SpellSaleModel().values_cur()) => { const { income, cost_sum } = m_data; console.log(m_data, (income - cost_sum) / cost_sum) }
// an_fn(new SpellSaleModel(10 * 100, 20 * 100, 0.2, 0.1).set_free_max(5).set_free_cnt(3).values_cur())
// an_fn(new SpellSaleModel(3000 * 100, 3999 * 100, 0.2, 0.01, 0.01).set_free_cnt(10).values_cur())
// an_fn(new SpellSaleModel(3000, 3999, 0.2, 0.01, 0, 1).values_cur())
