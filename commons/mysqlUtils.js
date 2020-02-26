const tbu = require("./tableUtils")
const mysql = require('mysql')

const pool = mysql.createPool({
  connectionLimit: 100,
  host: '127.0.0.1',
  user: 'onefrt',
  password: 'onefrt',
  database: 'onefrt_luck',
  charset: 'utf8_general_ci',
  dateStrings: true, // 将日期类型转为字符串
  // multipleStatements: true // 允许执行多条语句(用';'分隔)
})

// 引入结构对象类的声明
const QueryStruct = require("./QueryStruct")
const CallBack = require("./CallBack")

/**
 * 读取/查询(SELECT)，可递归
 * @param {mysql.PoolConnection} conn 数据库连接
 * @param {QueryStruct} qs 查询结构
 * @param {CallBack} callback 回调函数
 */
const reads = (conn, qs, callback) => {
  conn.query(qs.sql, (err, rlts, flds) => { // 执行查询
    if (err) {
      conn.release(); // 释放连接
      if (callback && callback.fail) return callback.fail(err);
      throw err;
    } // console.log(rlts); console.log(flds)
    const param_next = qs.next ? qs.next(rlts, flds) : false;
    if (param_next) return reads(conn, param_next, callback) // 递归继续查询
    // 操作完成
    conn.release() // 释放连接
    if (callback && callback.success) callback.success()
  })
}

/**
 * 写入/增删改，可递归
 * @param {mysql.PoolConnection} conn 数据库连接
 * @param {QueryStruct} qs 查询结构
 * @param {CallBack} callback 回调函数
 */
const writes = (conn, qs, callback) => {
  conn.query(qs.sql, (err, rlts, flds) => { // 执行更新
    if (err) {
      return conn.rollback(() => { // 回滚事务
        conn.release() // 释放连接
        if (callback && callback.fail) return callback.fail(err)
        throw err
      })
    } // console.log(rlts); console.log(flds)
    const param_next = qs.next ? qs.next(rlts, flds) : false
    if (param_next) return writes(conn, param_next, callback) // 操作继续执行更新
    // 操作完成
    conn.commit(err => { // 提交事务
      if (err) { // 提交事务-发生异常
        return conn.rollback(() => { // 回滚事务
          conn.release() // 释放连接
          if (callback && callback.fail) return callback.fail(err)
          throw err
        })
      }
      conn.release() // 释放连接
      if (callback && callback.success) callback.success()
    })
  })
}

/**
 * SQL增
 * @param {string} tbn 数据表
 * @param {*} param 参数,{c1:v1,c2:v2,...,cN:vN}
 */
const sqlAdd = (tbn, param) => {
  let cs = []
  let vs = []
  const cols = tbu.tableCols(tbn)
  for (const k in param) {
    if (cols.indexOf(k) > -1) { // 排除未申明的字段
      cs.push(k)
      vs.push(param[k])
    }
  }
  return mysql.format('INSERT INTO ??(??) VALUES(?)', [tbn, cs, vs])
}

/**
 * SQL删
 * @param {string} tbn 数据表
 * @param {*} param 参数,{c1:v1,c2:[v2]}
 */
const sqlDel = (tbn, param) => {
  let sql = mysql.format('DELETE FROM ?? WHERE', [tbn])
  let len0 = sql.length
  for (const k in param) {
    sql += (sql.length > len0 ? ' AND ' : ' ') + mysql.format((param[k] instanceof Array) ? '?? IN(?)' : '??=?', [k, param[k]])
  }
  return sql
}

/**
 * SQL改
 * @param {string} tbn 数据表
 * @param {*} param 参数,{vs:{c3:v3,c4:v4,c5:v5},whr:{c1:v1,c2:[v2]}}
 */
const sqlUpd = (tbn, param) => {
  const cs = tbu.tableCols(tbn)
  const vs = {}
  for (const c in param.vs) {
    if (cs.indexOf(c) > -1) vs[c] = param.vs[c]
  }
  let sql = mysql.format('UPDATE ?? SET ? WHERE', [tbn, vs])
  let len0 = sql.length
  for (const k in param.whr) {
    sql += (sql.length > len0 ? ' AND ' : ' ') + mysql.format((param.whr[k] instanceof Array) ? '?? IN(?)' : '??=?', [k, param.whr[k]])
  }
  return sql
}

/**
 * SQL查
 * @param {string} tbn 数据表
 * @param {*} param 参数,{cs:str|[c1,c2,c3,c4,c5],whr?:str|{c1:v1,c2:[v2]},ord?:str|{c1:ASC,c2:DESC},lmt?:n}
 */
const sqlGet = (tbn, param) => {
  // 查询列
  let sql = (param.cs instanceof Array) ? mysql.format('SELECT ?? FROM ??', [param.cs, tbn]) : mysql.format(`SELECT ${param.cs} FROM ??`, tbn)
  if (param.whr) { // where 查询条件
    if (typeof param.whr == "object") {
      let len = sql.length
      for (const k in param.whr) {
        sql += (len < sql.length) ? ' AND ' : ' WHERE '
        sql += mysql.format((param.whr[k] instanceof Array) ? '?? IN(?)' : '??=?', [k, param.whr[k]])
      }
    } else if (typeof param.whr == "string") {
      if (param.whr.trim().length > 0) sql += ' WHERE ' + param.whr
    }
  }
  if (param.ord) { // order by 查询分组
    if (typeof param.ord == "object") {
      let len = sql.length
      for (const k in param.ord) {
        sql += (len < sql.length) ? ' , ' : ' ORDER BY '
        sql += mysql.format('?? ', k)
        if (param.ord[k].toUpperCase() == 'DESC') sql += ' DESC'
      }
    } else if (typeof param.ord == "string") {
      if (param.ord.trim().length > 0) sql += ' ORDER BY ' + param.ord
    }
  }
  if (param.lmt) { // limit 结果数量
    let lmt = 1 * param.lmt
    if (typeof lmt == "number") lmt = Math.round(lmt)
    if (lmt > 0) sql += ' LIMIT ' + lmt
  }
  return sql
}


module.exports = {

  /** 结束，关闭连接池 */
  // end: pool.end,

  /**
   * 执行读数据库的操作(非事务)，查询(SELECT)，可递归
   * @param {QueryStruct} qs 查询结构
   * @param {CallBack} callback 回调函数
   */
  reads: (qs, callback) => {
    pool.getConnection((err, conn) => { // 获取数据库连接
      if (err) { // 获取连接-发生异常
        if (callback && callback.fail) return callback.fail(err)
        throw err
      }
      reads(conn, qs, callback)
    })
  },

  /**
   * 执行写数据库的操作(事务化)，包括增(INSERT)、删(DELETE)、改(UPDATE)，可递归
   * @param {QueryStruct} qs 查询结构
   * @param {CallBack} callback 回调函数
   */
  writes: (qs, callback) => {
    pool.getConnection((err, conn) => { // 获取数据库连接
      if (err) { // 获取连接-发生异常
        if (callback && callback.fail) return callback.fail(err)
        throw err
      }
      conn.beginTransaction(err => { // 开始事务
        if (err) { // 开始事务-发生异常
          conn.release() // 释放连接
          if (callback && callback.fail) return callback.fail(err)
          throw err
        }
        writes(conn, qs, callback)
      })
    })
  },

  /** 格式化SQL字符串 mysql.format */
  format: mysql.format,

  /**
   * SQL增
   * @param {string} tbn 数据表
   * @param {*} param 参数,{c1:v1,c2:v2,...,cN:vN}
   */
  sqlAdd: sqlAdd,

  /**
   * SQL删
   * @param {string} tbn 数据表
   * @param {*} param 参数,{c1:v1,c2:[v2]}
   */
  sqlDel: sqlDel,

  /**
   * SQL改
   * @param {string} tbn 数据表
   * @param {*} param 参数,{vs:{c3:v3,c4:v4,c5:v5},whr:{c1:v1,c2:[v2]}}
   */
  sqlUpd: sqlUpd,

  /**
   * SQL查
   * @param {string} tbn 数据表
   * @param {*} param 参数,{cs:str|[c1,c2,c3,c4,c5],whr?:str|{c1:v1,c2:[v2]},ord?:str|{c1:ASC,c2:DESC},lmt?:n}
   */
  sqlGet: sqlGet

}