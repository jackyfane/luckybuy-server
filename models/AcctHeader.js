const {commonMySQL} = require('../commons/mysql');
const Account = require('./Account');

/**
 * 配送地址
 */
const AcctHeader = commonMySQL.define('account_header', Account.attributes);

module.exports = AcctHeader;