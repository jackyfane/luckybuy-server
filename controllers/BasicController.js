const services = require('../services');
const { isEmpty } = require('../utils/string.utils');


/**
 * 控制器基础功能
 */
module.exports = class BasicController {

  constructor(modelName) {

    /**
     * 实例化service
     */
    let service = new services[modelName](modelName);

    /**
     * 返回实例化的service
     */
    this.getService = () => service;

    /**
     * 根据条件查询（或分页查询）
     * @param req
     * @param res
     * @param next
     */
    this.list = (req, res, next) => {
      // let object = isEmpty(req.query) ? req.body : req.query;
      let object = { ...req.query, ...req.body };
      this.getService().list(object, function (data) {
        res.json(data);
      });
    };

    /**
     *
     * @param req
     * @param res
     * @param next
     */
    this.rayQuery = (req, res, next) => {
      let sql = isEmpty(req.query) ? req.body.sql : req.query.sql;
      this.getService().rayQuery(sql, function (data) {
        res.json(data);
      });
    };

    /**
     * 创建
     * @param req
     * @param res
     * @param next
     */
    this.create = (req, res, next) => {
      let params = { ...req.query, ...req.body };
      this.getService().create(params, function (data) {
        res.json(data);
      });
    };

    /**
     * 删除
     * @param req
     * @param res
     * @param next
     */
    this.delete = (req, res, next) => {
      let params = req.params.id ? req.params.id : { ...req.query, ...req.body };
      this.getService().remove(params, function (data) {
        res.json(data);
      });
    };

    /**
     * 编辑
     * @param req
     * @param res
     * @param next
     */
    this.edit = (req, res, next) => {
      this.detail(req, res, next);
    };

    /**
     * 更新
     * @param req
     * @param res
     * @param next
     */
    this.update = (req, res, next) => {
      let params = { ...req.query, ...req.body };
      this.getService().update(params, req.params.id, function (data) {
        res.json(data);
      });
    };

    /**
     * 明细（根据ID查询）
     * @param req
     * @param res
     * @param next
     */
    this.detail = (req, res, next) => {
      this.getService().findById(req.params.id, function (data) {
        res.json(data);
      }, { ...req.query, ...req.body });
    };
  }
};