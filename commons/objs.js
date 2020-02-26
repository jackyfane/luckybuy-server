// 数据结构、对象的定义

/** 查询结构 */
class QueryParam {
  /**
   * @param {string} sql 查询语句
   * @param {function} next 处理当前的结果并获取下一轮的参数(为空则结束)
   */
  constructor(sql, next) {
    /** 查询语句 */
    this.sql = sql
    /** 处理当前的结果并获取下一轮的参数(为空则结束) */
    this.next = next
  }
}

/** 回调结构 */
class CallBack {
  /**
   * @param {function} success 回调成功
   * @param {function} fail 回调失败
   * @param {function} complete 回调完成
   */
  constructor(success, fail, complete) {
    /** 回调成功 */
    this.success = success
    /** 回调失败 */
    this.fail = fail
    /** 回调失败 */
    this.complete = complete
  }
}
