/** 查询结构 */
module.exports = class QueryStruct {
  /**
   * @param {string} sql 查询语句
   */
  constructor(sql) {
    /** 查询语句 */
    this.sql = sql
  }

  /**
   * 处理当前的结果并获取下一轮的参数(为空则结束)
   * @param {array} rlt 结果集
   * @param {*} fld 结果列
   */
  next(rlt, fld) {
    return new QueryStruct()
  }
}
