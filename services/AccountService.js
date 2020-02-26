const { isEmpty } = require('../utils/string.utils');
const { transfers } = require('../wxpay-api/wxpay');
const log4js = require('../commons/Log4jsConfig');
const logger = log4js.getLogger('services.Account');
const SystemConfig = require('../commons/SystemConfig');
const { withdraw: Withdraw, user: User } = require('../models');
const { commonMySQL: MySQL } = require('../commons/mysql');

const WithdrawService = require('./WithdrawService');
const UserService = require('./UserService');

const withdrawService = new WithdrawService('withdraw');
const userService = new UserService('user');

module.exports = {

	/**
	 * 创建账户，首先检查账户是否存在，如果已经存在，则更新账户总金额，如果不存在，则创建账户
	 * @param {model} Model 数据模型
	 * @param {Object} params 参数
	 * @param {function} callback 回调
	 */
	create: (Model, params, callback) => {
		if (isEmpty(params)) {
			callback({
				status: 'failure',
				message: '要创建的数据不能为空'
			});
		} else {
			Model.findOne({
				where: {
					user_id: params['user_id']
				}
			}).then((account) => {
				if (account) {
					account['total_amount'] += params['total_amount'];
					account.save().then(() => {
						callback({ status: 'success', message: '账户金额更新成功' });
					}).catch(error => {
						callback({ status: 'failure', message: error.message });
					});
				} else {
					Model.create(params).then(account => {
						callback({ status: 'success', data: account });
					}).catch(error => {
						callback({ status: 'failure', message: error.message });
					});
				}
			});
		}
	},

	/**
	 * 提现，校验提现金额是否大于可提现金额，只有在可提现金额范围内，才准许提现
	 * 其次，首先将提现记录入库，然后发起提现转账
	 * 如果转账失败，则删除提现数据
	 * 如果转账成功，则更新总账户提现金额
	 * @param Model 数据模型
	 * @param {Object} params 参数
	 * @param {Promise} promise 主键生成器函数
	 * @param {function} callback 回调函数
	 */
	withdraw_old: (Model, params, promise, callback) => {
		Model.findOne({
			where: {
				user_id: params['withdraw_to'] ? params['withdraw_to'] : params['user_id']
			}
		}).then(account => {
			const ok = account['total_amount'] - account['total_withdraw'] >= params['withdraw_amount'];
			if (ok) {
				promise().then(pk => {
					params['withdraw_id'] = pk;
					withdrawService.create(params, result => {
						if (result['status'] === 'success') {
							userService.findById(params['withdraw_to'], result => {
								if (result['status'] === "success") {
									const data = result['data'];
									transfers({
										partner_trade_no: pk,
										openid: data['open_id'],
										amount: params['withdraw_amount'],
										desc: params['desc']
									}, {
											success: (data) => {
												//转账成功，上调总账户提现金额
												Model.findOne({
													where: {
														user_id: params['withdraw_to']
													}
												}).then((account) => {
													account.total_withdraw += params['withdraw_amount'];
													account.save().then(() => {
														logger.info('===============提现成功，账户提现金额更新完成==================');
														const amount = params['withdraw_amount'] / 100;
														callback({ status: 'success', message: '提现成功,提现金额：' + amount.toFixed(2) + '元' });
													}).catch(error => {
														logger.error(error);
														logger.error('===============提现成功，账户提现金额更新失败==================');
														callback({ status: 'failure', message: error.message });
													});
												}).catch(error => {
													logger.error(error);
													callback({ status: 'failure', message: error.message });
												});
											},

											fail: (error) => {
												//转账失败，删除提现记录
												callback({ status: 'failure', message: error });
												withdrawService.remove({ withdraw_id: pk }, result => {
													console.log('转账失败，删除提现记录完成', result);
												});
											}
										});
								}
							});
						}
					});
				}).catch(error => {
					throw error;
				});
			}
		}).catch(error => {
			callback({ status: 'failure', message: error.message });
		});
	},

	/**
	 * 在同一个事务中完成提现，暂时不使用
	 * @param Model
	 * @param params
	 * @param promise
	 * @param callback
	 */
	withdraw: (Model, params, promise, callback) => {
		const account_limit = SystemConfig.get_property('spell_account_limit');
		const sql = "SELECT " + account_limit + " - coalesce(sum(w.withdraw_amount), 0) / 100 withdraw_limit\n" +
			"FROM withdraw_detail w\n" +
			"WHERE w.withdraw_to = " + params['withdraw_to'] +
			"  AND date_format(w.created_time, '%Y-%m-%d') = date_format(now(), '%Y-%m-%d')";

		promise().then(pk => {
			return MySQL.transaction(transaction => {
				return MySQL.query(sql, { transaction }).then(result => {
					const withdraw_limit = result[0][0]['withdraw_limit'] * 1;
					if (params['withdraw_amount'] * 1 > withdraw_limit)
						throw new Error("额度不足，你今日剩余提现额度为：" + withdraw_limit)
				}).then(() => {
					return Model.findOne({
						where: {
							user_id: params['withdraw_to'] ? params['withdraw_to'] : params['user_id']
						}
					}, { transaction }).then(account => {
						if (!account)
							throw new Error('账户信息查找失败！');
						return account;
					});
				}).then(account => {
					const ok = account['total_amount'] - account['total_withdraw'] >= params['withdraw_amount'];
					if (!ok)
						throw new Error('账户余额不足');
					params['withdraw_id'] = pk;
					return Withdraw.create(params, { transaction }).then(() => account);
				}).then(account => {
					return User.findOne({ where: { user_id: params['withdraw_to'] } }, { transaction }).then(user => {
						if (!user) throw new Error('用户查找失败');
						return { account: account, user: user };
					});
				}).then(objects => {

					transfers({
						partner_trade_no: pk,
						openid: objects.user['open_id'],
						amount: params['withdraw_amount'],
						desc: params['desc']
					}, {
							success: (data) => {
								//转账成功，上调总账户提现金额
								Model.update({
									total_withdraw: objects.account['total_withdraw'] + params['withdraw_amount']
								}, {
										where: {
											user_id: objects.user['user_id']
										}
									}, { transaction }).then(() => {
										logger.info('===============提现成功，账户提现金额更新完成==================');
										const amount = params['withdraw_amount'] / 100;
										callback({ status: 'success', message: '提现成功,提现金额：' + amount.toFixed(2) + '元' });
									}).catch(error => {
										logger.error(error);
										logger.error('===============提现成功，账户提现金额更新失败==================');
										callback({ status: 'failure', message: error.message });
									});
							},

							fail: (error) => {
								//转账失败，删除提现记录
								callback({ status: 'failure', message: error });
								Withdraw.destroy({ where: { withdraw_id: pk } }, { transaction }, result => {
									console.log('转账失败，删除提现记录完成', result);
								});
							}
						});
				});
			}).catch(error => {
				throw error;
			});
		}).catch(error => {
			callback({ status: 'failure', message: error.message });
		});
	},

	/** 明细(流水)账 */
	detail: ({ producer, consumer, limit, typ }, sf = ret => { }, ff = err => { }) => {
		if (limit > 0) {
			if (producer != undefined || consumer != undefined) {
				const bind = [...(producer ? ['account_merchant', producer] : ['account_header', consumer]), limit];
				const [col_fee, col_user] = producer ? ['f.merchant_fee', 'm.user_id'] : ['f.header_fee', 'sh.user_id'];
				let sql = typ != '+' ? "SELECT -w.withdraw_amount AS amount, DATE_FORMAT(w.created_time,'%Y-%m-%d %H:%i:%s') AS dtm, '' AS remark, NULL AS fid FROM withdraw_detail w WHERE withdraw_from=$1 AND w.withdraw_to=$2" : '';
				if (typ != '-') sql = (sql ? `${sql} UNION ALL ` : '') + (
					'SELECT +' + col_fee + ' AS amount, DATE_FORMAT(' + (producer ? 'f.updated_time' : 'f.created_time') + ",'%Y-%m-%d %H:%i:%s') AS dtm, CONCAT('拼手气【',f.hand_id,'】') AS remark, f.detail_id AS fid"
					+ ' FROM fee_detail f LEFT JOIN spell_hand sh ON sh.hand_id=f.hand_id'
					+ (producer ? ' LEFT JOIN goods g ON g.goods_id=sh.goods_id LEFT JOIN merchant m ON m.merchant_id=g.merchant_id' : '')
					+ ' WHERE ' + (producer ? 'f.`status`=100 AND ' : '') + col_fee + '>0 AND ' + col_user + '=$2'
				);
				sql += ' ORDER BY dtm DESC  LIMIT 0,$3';
				MySQL.query(sql, { bind, type: MySQL.QueryTypes.SELECT }).then(list => { sf(list); }).catch(err => { ff(err.message); })
			} else ff('未知查询分类');
		} else return sf([]);
	}

};