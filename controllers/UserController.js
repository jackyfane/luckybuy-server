const BasicController = require('./BasicController');
const services = require('../services');

/**
 * 用户控制器
 */
class UserController extends BasicController {
  constructor(modelName) {
    super(modelName);

    // this.login = (req, res, next) => {
    //     this.getService().login(req.body, {
    //         success(ret) {
    //             res.json(ret);
    //         },
    //         fail(err) {
    //             console.error(err);
    //             res.json(ret);
    //         }
    //     });
    // };

    const service = this.getService()
    // 重定义数据处理方法(逻辑|流程)
    for (const act of ["login", "decryptPhoneNum"]) {
      const func = service[act]
      if (typeof func == "function") this[act] = (req, res, next) => func(req.body, {
        success(ret) {
          res.json(ret);
        },
        fail(err) {
          console.error(err);
          res.json(err);
        }
      });
    }
  }

}

module.exports = UserController;