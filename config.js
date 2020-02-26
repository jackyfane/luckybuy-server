const payUrl = 'http://127.0.0.1:3000/controller/payment/create';

/**
 * 数据库语言
 * @type {{sqlite: string, mysql: string, mssql: string, postgres: string}}
 */
const dialect = {
  mysql: 'mysql',
  mssql: 'mssql',
  sqlite: 'sqlite',
  postgres: 'postgres'
};

/**
 * 数据库配置
 * @type {{db1: {database: string, password: string, port: number, host: string, username: string}, db2: {database: string, password: string, port: number, host: string, username: string}}}
 */
const databases = {
  db_dev: {
    host: '139.159.132.214',
    port: 3306,
    database: 'onefrt_luck_dev',
    username: 'onefrt',
    password: 'onefrt'
  },
  db1: {
    host: 'localhost',
    port: 3306,
    database: 'onefrt_luck',
    username: 'onefrt',
    password: 'onefrt'
  },
  db2: {
    host: '139.159.132.214',
    port: 3306,
    database: 'onefrt_luck',
    username: 'onefrt',
    password: 'onefrt'
  }
};


/**
 *
 * @type {{reads: *[], writes: (databases.db1|{database, password, port, host, username})[], uuids: *[]}}
 */
module.exports = {
  dialect: dialect,
  writeServers: databases.db1, //写数据只支持一个数据库
  // readServers: [databases.db1, databases.db2],
  readServers: [databases.db1],
  uuidServers: [databases.db1],
  payUrl: payUrl
};