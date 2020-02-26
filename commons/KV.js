/** 键值对 */
module.exports = class KV {
  /**
   * @param {string} k 键
   * @param {string} v 值
   */
  constructor(k, v) {
    /** 键 */
    this.k = k
    /** 值 */
    this.v = v
  }
}
