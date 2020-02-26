const {commonMySQL} = require('../commons/mysql');
const Account = require('./Account');

/**
 * 配送地址
 */
const AcctMerchant = commonMySQL.define('account_merchant', Account.attributes);

module.exports = AcctMerchant;