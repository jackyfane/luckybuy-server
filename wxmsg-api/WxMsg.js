
const fs = require("fs")
const path = require("path")
const request = require("request")

const { appid, appSecret } = require("../wxpay-api/cfg")

/**
 * 获取小程序全局唯一后台接口调用凭据（access_token）。调调用绝大多数后台接口时都需使用 access_token，开发者需要进行妥善保存。
 * https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/access-token/auth.getAccessToken.html
 */
const getAccessToken = (success = access_token => { }, fail = err => { }, re_gen = false) => {
  const token_file = path.join(__dirname, 'access.token')
  const now = () => Math.floor(Date.now() / 1000) // 当前时间(秒)
  const gen = () => {
    request.get({
      uri: 'https://api.weixin.qq.com/cgi-bin/token',
      qs: { grant_type: 'client_credential', appid, secret: appSecret },
      json: true
    }, (err, resp, body) => {
      if (err) return fail(err)
      const { access_token, expires_in, errcode, errmsg } = body
      if (errcode) return fail(body)
      fs.writeFile(token_file, JSON.stringify({ access_token, expires: now() + expires_in }), err => {
        return err ? fail(err) : success(access_token)
      })
    })
  }
  const get = () => {
    fs.readFile(token_file, {}, (err, data) => {
      if (err) return fail(err)
      const { access_token, expires } = JSON.parse(data.toString())
      return now() < expires ? success(access_token) : gen()
    })
  }
  return re_gen || !fs.existsSync(token_file) ? gen() : get()
}

const accessRequest = ({ uri, method = 'POST', qs = {}, body = {}, success = () => { }, fail = err => { } }) => {
  let re_gen = false
  const f = access_token => {
    request({
      uri, qs: { access_token, ...qs }, method,
      headers: { "content-type": "application/json" },
      body, json: true
    }, (err, resp, body) => {
      if (err) fail(err)
      else if (body.errcode) { // const { errcode, errmsg } = body
        if (body.errcode == '40001' && !re_gen) { // 若是access_token过期造成的失败，则重新获取access_token、再发一次请求
          getAccessToken(f, fail, re_gen = true)
        }
        else fail(body)
      }
      else success()
    })
  }
  getAccessToken(f, fail, re_gen)
}

/** 客服消息 */
const customerServiceMessage = {
  /** 
   * 推送客服消息给用户, msgtype:{'text':"文本消息",'image':"图片消息",'link':"图文链接",'miniprogrampage':"小程序卡片"}
   * https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/customer-message/customerServiceMessage.send.html
   */
  send({ touser, msgtype,
    text = { content: '' },
    image = { media_id: '' },
    link = { title: '', description: '', url: '', thumb_url: '' },
    miniprogrampage = { title: '', pagepath: '', thumb_media_id: '' },
    success = () => { }, fail = err => { }
  }) {
    const msgtypes = { text, image, link, miniprogrampage }
    if (msgtypes[msgtype]) {
      accessRequest({
        uri: 'https://api.weixin.qq.com/cgi-bin/message/custom/send',
        body: { touser, msgtype, [msgtype]: msgtypes[msgtype] }, success, fail
      })
    } else fail(`不合法的消息类型，msgtype=${msgtype}`)
  },

  /**
   * 下发客服当前输入状态给用户, command:{'Typing':'对用户下发"正在输入"状态','CancelTyping':'取消对用户的"正在输入"状态'}
   * https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/customer-message/customerServiceMessage.setTyping.html
   */
  setTyping({ touser, command, success = () => { }, fail = err => { } }) {
    accessRequest({
      uri: 'https://api.weixin.qq.com/cgi-bin/message/custom/typing',
      body: { touser, command },
      success, fail
    })
  },

}

/** 模板消息 */
const templateMessage = {
  /**
   * 推送模板消息给用户
   * https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/template-message/templateMessage.send.html
   */
  send({
    touser, //	string		是	接收者（用户）的 openid
    template_id, //	string		是	所需下发的模板消息的id
    page = undefined, //	string		否	点击模板卡片后的跳转页面，仅限本小程序内的页面。支持带参数,（示例index?foo=bar）。该字段不填则模板无跳转。
    form_id, //	string		是	表单提交场景下，为 submit 事件带上的 formId；支付场景下，为本次支付的 prepay_id
    data = undefined, //	Object		否	模板内容，不填则下发空模板。具体格式请参考示例。
    emphasis_keyword = undefined, //	string		否	模板需要放大的关键词，不填则默认无放大
    success = () => { }, fail = err => { }
  }) {
    accessRequest({
      uri: 'https://api.weixin.qq.com/cgi-bin/message/wxopen/template/send',
      body: { touser, template_id, page, form_id, data, emphasis_keyword },
      success, fail
    })
  },

}

module.exports = {

  /** 客服消息 */
  customerServiceMessage,

  /** 商家发货通知 */
  customSend4merchantSend({ touser, order_id, hand_id, goods_name, goods_num, snd_dtm, seller, shop, shop_phone_num,
    success = () => console.log('通知拼客商家已发货，消息推送成功'),
    fail = err => { console.error('通知拼客商家已发货，消息推送失败：' + JSON.stringify(err)) }
  }) {
    customerServiceMessage.send({
      touser,
      msgtype: 'text',
      content: `您参与了拼手气活动【${hand_id}】，在${shop}【${shop_phone_num}】购买的${goods_name}【单号：${order_id}，数量：${goods_num}】，活动已成功，并且${seller}已经发货，时间：${snd_dtm}`,
      success, fail
    })
  },

  /** 拼客收货通知 */
  customSend4consumerReceive({ touser, order_id, hand_id, goods_name, cost, receiver, rcv_dtm, rcv_phone_num,
    success = () => console.log('通知商家拼客已收货，消息推送成功'),
    fail = err => { console.error('通知商家拼客已收货，消息推送失败：' + JSON.stringify(err)) }
  }) {
    customerServiceMessage.send({
      touser,
      msgtype: 'text',
      content: `你的产品【${goods_name}】在拼手气活动【${hand_id}】中的销售单【单号：${order_id}，金额：${cost}】，${receiver}【${rcv_phone_num}】已确认收取，时间：${rcv_dtm}`,
      success, fail
    })
  },


  /** 模板消息 */
  templateMessage,

  /** 成团通知商家发货 */
  tmplSend4merchantToSend({ form_id, touser, hand_id, goods_name, header, reward, start_time, person_num, finish_time, discounts,
    success = () => console.log('通知商家拼手气活动成功，消息推送成功'),
    fail = err => { console.error('通知商家拼手气活动成功，消息推送失败：' + JSON.stringify(err)) }
  }) {
    templateMessage.send({
      touser,
      page: `pages/user/orders?typ=sell&tabk=all&hand_id=${hand_id}`,
      template_id: 'WC-2OHHxFEUVhqs7qvpFotQy-kqP--czbjtBtGDFNCA',
      form_id,
      data: {
        "keyword1": { "value": `拼手气【${hand_id}】` }, // 活动名称
        "keyword2": { "value": goods_name }, // 商品名称
        "keyword3": { "value": header }, // 团长
        "keyword4": { "value": reward }, // 拼团奖励
        "keyword5": { "value": start_time }, // 开团时间
        "keyword6": { "value": person_num }, // 成团人数
        "keyword7": { "value": finish_time }, // 成团时间
        "keyword8": { "value": discounts }, // 拼团优惠
      },
      emphasis_keyword: goods_name,
      success, fail
    })
  },

  /** 商家发货通知 */
  tmplSend4merchantSend({ form_id, touser, order_id, goods_name, goods_num, snd_dtm, buy_dtm, seller, shop, receiver, rcv_code = '<无>',
    success = () => console.log('通知拼客商家已发货，消息推送成功'),
    fail = err => { console.error('通知拼客商家已发货，消息推送失败：' + JSON.stringify(err)) }
  }) {
    templateMessage.send({
      touser,
      page: `pages/user/order?typ=buy&order_id=${order_id}`,
      template_id: 'eQ-4rzVqKRkrGC7bRoVmRktSVUJKV-3zCubf2N-xY9s',
      form_id,
      data: {
        "keyword1": { "value": order_id }, // 订单编号
        "keyword2": { "value": goods_name }, // 商品名称
        "keyword3": { "value": goods_num }, // 数量
        "keyword4": { "value": snd_dtm }, // 发货时间
        "keyword5": { "value": buy_dtm }, // 购买时间
        "keyword6": { "value": seller }, // 商家
        "keyword7": { "value": shop }, // 店铺名称
        "keyword8": { "value": receiver }, // 收货人
        "keyword9": { "value": rcv_code }, // 取件码
      },
      emphasis_keyword: goods_name,
      success, fail
    })
  },

  /** 拼客收货通知 */
  tmplSend4consumerReceive({ form_id, touser, order_id, goods_name, goods_desc, cost, receiver, rcv_dtm, rcv_phone_num,
    success = () => console.log('通知商家拼客已收货，消息推送成功'),
    fail = err => { console.error('通知商家拼客已收货，消息推送失败：' + JSON.stringify(err)) }
  }) {
    templateMessage.send({
      touser,
      page: `pages/user/order?typ=sell&order_id=${order_id}`,
      template_id: 'Kc497Hn8Zs5ItL6guDd9JsuoQA2X8_fgulDNRlaMsNg',
      form_id,
      data: {
        "keyword1": { "value": order_id }, // 订单编号
        "keyword2": { "value": goods_name }, // 商品名称
        "keyword3": { "value": goods_desc }, // 商品详情
        "keyword4": { "value": cost }, // 支付金额
        "keyword5": { "value": receiver }, // 收货人
        "keyword6": { "value": rcv_dtm }, // 收货时间
        "keyword7": { "value": rcv_phone_num }, // 收货人电话
      },
      emphasis_keyword: goods_name,
      success, fail
    })
  },


}




