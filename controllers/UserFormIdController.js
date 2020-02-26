
const { add } = require("../services/UserFormIdService")

/**
 * user_form_id控制器
 */
class UserFormIdController {
  constructor() {
    this.add = (req, res, next) => { add({ ...req.query, ...req.body }, obj => res.json(obj)) }
  }
}

module.exports = UserFormIdController;