const BasicService = require("./BasicService");

const CallBack = require("../commons/CallBack");
const {appid} = require("../wxpay-api/cfg");
const {code2openid, decrypt} = require("../wxpay-api/utils");

/** login隐藏列 */
const cols_hide4login = ["openid", "unionid", "wx_info"];
const wx_info_search_keys = ["weixin_name", "city", "province", "country"];

/**
 * 用户信息业务处理类
 */
class UserService extends BasicService {

  constructor(modelName) {
    super(modelName);

    const _self = this
    /**
     * 登录
     * @param {KV} data 参数
     * @param {CallBack} callback 回调
     */
    this.login = (data, callback) => {
      const {code, wx_info} = data
      if (code) {
        code2openid(code, (err, open_id) => {
          if (err) return callback.fail(err);
          // console.log(open_id, data)
          // 微信用户信息
          const wx = typeof wx_info == "string" ? JSON.parse(wx_info) : wx_info
          const where = {open_id};
          const user_new = {
            weixin_name: wx.nickName,
            avatar_url: wx.avatarUrl,
            country: wx.country,
            province: wx.province,
            city: wx.city
          }
          const model = _self.getModel()
          model.findOrCreate({where, defaults: {open_id, ...user_new}}).then(ret => {
            const user_stg = {}
            for (const k of ret[0].attributes) user_stg[k] = ret[0][k]
            if (!ret[1]) {
              let user_upd = false // 取差异以更新
              for (const k in user_new) {
                if (user_new[k] != user_stg[k]) { // 有差异
                  if (user_upd) user_upd[k] = user_new[k]
                  else user_upd = {[k]: user_new[k]}
                }
              }
              // console.log({ user_new, user_stg, user_upd })
              if (user_upd) { // 有更新
                model.update(user_upd, {where})
                for (const k in user_upd) user_stg[k] = user_upd[k]
              }
            }
            delete user_stg.open_id
            callback.success(user_stg)
          }).catch(err => {
            if (err) console.error(err)
          });
        })
      } else {
        callback.fail('获取微信用户信息失败');
      }
    }

    /**
     * 解码出手机号
     * @param {KV} data 参数
     * @param {CallBack} callback 回调
     */
    this.decryptPhoneNum = (data, callback) => {
      const {code, encryptedData, iv} = data
      code2openid(code, (err, openid, wx_session) => {
        if (err) return callback.fail(err)
        try {
          const {
            purePhoneNumber, phoneNumber,
            watermark
          } = JSON.parse(decrypt(encryptedData, 'aes-128-cbc', Buffer.from(wx_session.session_key, 'base64'), Buffer.from(iv, 'base64')))
          if (watermark.appid != appid) callback.fail({err: 'illegal app'})
          else callback.success({phoneNum: purePhoneNumber || phoneNumber})
        } catch (err) {
          callback.fail({err: err.message})
        }
      })
    }

  }

}

module.exports = UserService;