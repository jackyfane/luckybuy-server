const models = require('../models');
const {Op} = require('sequelize');
const {isEmpty} = require('../utils/string.utils');
const {commonMySQL, uuidMySQL} = require("../commons/mysql");

/**
 * 基础业务处理类
 */
module.exports = class BasicService {

  constructor(modelName) {

    // let _self = this;

    const Model = models[modelName];

    /**
     * get model instance
     * @returns {model}
     */
    this.getModel = () => Model;

    /**
     * get database connection instance
     * @returns {Sequelize|Sequelize|Sequelize}
     */
    this.getMySQL = () => commonMySQL;

    /**
     * get database connection instance for uid
     * @returns {Sequelize|Sequelize|Sequelize}
     */
    this.getUIDMySQL = () => uuidMySQL;

    /**
     * get Sequelize Op
     * @returns {Sequelize.Op}
     */
    this.getOp = () => Op;

    /**
     * 创建
     * @param {object} params K-V数据对象，K必须与调用模块的数据模型字段匹配
     * @param {function} callback 回调函数
     */
    this.create = (params, callback) => {
      if (isEmpty(params)) {
        callback({
          status: 'failure',
          message: '要创建的数据不能为空'
        });
      } else {
        this.getModel().create(params).then(rows => {
          callback({
            status: 'success',
            data: rows
          });
        }).catch(err => {
          callback({
            status: 'failure',
            message: err.message
          });
        });
      }
    };

    /**
     * 根据条件删除
     * @param params
     * @param callback
     */
    this.remove = (params, callback) => {

      if (isEmpty(params)) {
        callback({
          status: 'failure',
          message: '请指定需要删除的数据'
        });
        return;
      }

      let where = {};
      if (params.constructor === Object) {
        for (let key in params) {
          if (this.getModel().attributes[key]) {
            where[key] = params[key];
          }
        }
      } else if (params.constructor === Array || params.constructor === String) {
        where[this.getModel().primaryKeyAttribute] = params;
      }

      this.getModel().destroy({
        where: where
      }).then(rows => {
        callback({
          status: 'success',
          data: rows
        });
      }).catch(err => {
        callback({
          status: 'failure',
          message: err.message
        });
      });
    };

    /**
     * update by id
     * @param {k, v} params
     * @param {any} where
     * @param {function} callback
     */
    this.update = (params, where, callback) => {
      if (isEmpty(params)) {
        callback({
          status: 'failure',
          message: '请指定需要修改的数据'
        });
        return;
      }

      let _where = {};
      if (where.constructor === String) {
        _where[this.getModel().primaryKeyAttribute] = where;
      } else {
        _where = where;
      }

      this.getModel().update(params, {
        where: _where
      }).then(rows => {
        callback({
          status: 'success',
          data: rows
        });
      }).catch(err => {
        callback({
          status: 'failure',
          message: err.message
        });
      });
    };

    /**
     * 根据ID查询
     * @param id
     * @param callback
     */
    this.findById = (id, callback) => {

      this.getModel().findByPk(id).then(rows => {
        callback({
          status: 'success',
          data: rows,
        });
      }).catch(err => {
        callback({
          status: 'failure',
          message: err.message
        });
      });
    };

    /**
     *
     * object对象的参数说明
     * columns:[name1, name2, ..., namen] 数组，用于指定查询的列名;
     * where: {Object} where条件；
     * groupby: [] 数组，分组条件；
     * orderby: [] 数组，排序条件；
     * offset: 0 分页开始
     * limit: 20 分页结束
     * @param {k, v} params
     * @param callback
     */
    this.list = (params, callback) => {


      let options = {};
      if (params['columns']) options.attributes = params['columns'];
      if (params['where']) options.where = (typeof params['where'] == 'object') ? params['where'] : eval(params['where']);
      if (params['groupby']) options.group = params['groupby'];
      if (params['orderby']) options.order = params['orderby'];

      options.offset = params.offset || 0;
      if (params['limit']) options.limit = params['limit'];

      this.getModel().findAll(options).then(rows => {
        callback({
          status: 'success',
          data: rows
        });
      }).catch(err => {
        callback({
          status: 'failure',
          message: err.message
        });
      });
    };

    /**
     * 原始SQL查询
     * @param {string} sql SQL语句
     * @param {object} replacements 根据SQL语句形式传递参数，SQL采用:field，则传递{field:value},使用?，则传递数组
     * @param {string} query_type 查询类型
     * @param {function} callback 回调函数
     */
    this.raw_query = (sql, replacements, query_type, callback) => {
      if (isEmpty(sql)) {
        callback({
          status: 'failure',
          message: '输入的SQL不可为空'
        });
      } else {
        this.getMySQL().query(sql, {
          replacements: replacements,
          type: query_type
        }).then(rows => {
          callback({
            status: 'success',
            data: rows
          });
        }).catch(err => {
          callback({
            status: 'failure',
            data: err.message
          });
        });
      }
    };

    /**
     * 执行函数
     * @param {string} procedure 函数名称
     * @param {string} placeholders 存储过程定义的参数, 格式为：? 或者:email，多个参数用英文字符的逗号分隔
     * @param {k, v} replacements 参数值 格式为：["me@jsbot.io"] or { email: "me@jsbot.io"}
     * @param {Transaction} transaction 事务
     * @returns {Promise<any>}
     */
    this.execute_procedure = (procedure, placeholders, replacements) => {
      return this.getMySQL().query(`CALL ${procedure}(${placeholders});`, {
        replacements: replacements,
        type: this.getMySQL().QueryTypes.RAW
      });
    };

    /**
     * 生成订单ID和支付ID
     * @returns {Promise<any>}
     */
    this.generate_order_pay_pk = () => {
      return new Promise((resolve, reject) => {
        try {
          this.getUIDMySQL().query("select getuid() as order_id, getuid() as pay_id")
              .then(row => {
                resolve({
                  order_id: row[0][0]['order_id'],
                  pay_id: row[0][0]['pay_id']
                });
              }).catch(error => reject(error));
        } catch (e) {
          reject("uuid database don't connect, please check your database config");
        }
      });
    };

    /**
     * 生成主键ID
     * @returns {Promise<any>}
     */
    this.generate_primary_key = () => {
      return new Promise((resolve, reject) => {
        try {
          this.getUIDMySQL().query("select getuid() as uid")
              .then(row => {
                resolve((row[0][0]).uid);
              })
              .catch(error => reject(error));
        } catch (e) {
          reject("uuid database don't connect, please check your database config");
        }
      });
    };
  }
};