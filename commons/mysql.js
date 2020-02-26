const Sequelize = require('sequelize');
const moment = require('moment');

// const {
//     hashCode
// } = require('../utils/string.utils');

const {
  dialect,
  writeServers,
  readServers,
  uuidServers
} = require('../config');

const define = {
  //使用定义的模型复数作为数据库表名，默认为false，即使用模型复数作为表名进行查询
  freezeTableName: true,
  //禁止添加时间属性：created_at、updated_at, deleted_at等，默认为true
  //如果数据库表已定义且没有相关字段，执行的SQL的时候会抛出未知列异常
  timestamps: false,
  paranoid: true,
  primaryKey: false,
  underscored: true,
  charset: 'utf8',
  dialectOptions: {
    collate: 'utf8_general_ci'
  }
};

// MySQL数据库配置
const commonMySQL = new Sequelize({
  dialect: dialect.mysql,
  replication: {
    read: readServers,
    write: writeServers
  },
  pool: {
    max: 10000,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  operatorsAliases: false,
  define: define,
  timezone: '+08:00', // 东八时区
  logging: false
});


/**
 * sort by host
 * @param {*} a
 * @param {*} b
 */
const sortbyHost = (a, b) => {
  if (hashCode(a.host) > hashCode(b.host)) {
    return 1;
  } else if (hashCode(a.host) < hashCode(b.host)) {
    return -1;
  }
  return 0;
};

/**
 * get uuid database server connectioin
 */
// const uuidMySQL = uuidServers.sort(sortbyHost).map(dbcfg => new Sequelize({//按照IP的hash码进行排序
const uuidSequelizes = uuidServers.map(dbcfg => new Sequelize({

  dialect: dialect.mysql,
  replication: {
    read: dbcfg,
    write: dbcfg
  },
  pool: {
    max: 100,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  operatorsAliases: false,
  logging: false
}));

const uuidMySQL = new Sequelize({
  dialect: dialect.mysql,
  replication: {
    read: uuidServers,
    write: uuidServers[0]
  },
  pool: {
    max: 100,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  operatorsAliases: false,
  define: define,
  logging: false,
  timezone: '+08:00' // 东八时区
});

/**
 * 获取第一个能连接的服务
 */
const getValidSequelize = () => {

  for (let i in uuidSequelizes) {
    try {
      let sequelize = uuidSequelizes[i];
      sequelize.authenticate().then(() => {
        console.log("test")
      }).catch(error => {
        throw error
      });
      return uuidSequelizes[i];
    } catch (error) {
      console.log(error.message);
    }
  }
};

/**
 * @param {string} attribute
 */
function dateFormat(target, attribute) {
  let value = target.getDataValue(attribute);
  return value ? moment(value).format('YYYY-MM-DD HH:mm:ss') : value;
}

/**
 *
 * @type {{commonMySQL: (Sequelize|Sequelize), uuidMySQL: Sequelize}}
 */

module.exports = {
  commonMySQL: commonMySQL,
  uuidMySQL: uuidMySQL,
  dateFormat: dateFormat
};