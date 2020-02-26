
const { commonMySQL: MySQL } = require('../commons/mysql')

/** 添加一个user_form_id */
const add = ({ user_id, form_id }, cb = obj => { }) => {
  MySQL.query(
    'CALL prod_add_form_id($1,$2,1)',
    { bind: [user_id, form_id], type: MySQL.QueryTypes.RAW }
  ).then(data => {
    cb({ status: 'success', data: data || '添加成功' })
  }).catch(err => {
    cb({ status: 'failure', message: err.message })
  })
}

/** 获取一个user_form_id */
const get = (user_id, cb = form_id => { }) => {
  MySQL.query(
    'CALL prod_get_form_id($1)',
    { bind: [user_id], type: MySQL.QueryTypes.RAW }
  ).then(rows => {
    if (rows.length > 0) cb(rows[0].form_id)
  }).catch(err => { console.error(err.message) })
}

module.exports = { add, get }
