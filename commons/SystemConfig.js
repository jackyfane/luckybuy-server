const logger = require('./Log4jsConfig').getLogger('commons.SystemConfig');
const ConfigService = require('../services/ConfigService');
const configService = new ConfigService('config');

class SystemConfig {

	constructor() {

		const pros_dict = {};

		/**
		 *
		 * @param callback
		 */
		configService.list({
			columns: ['item_name', 'item_value']
		}, function (result) {
			logger.info('=================开始加载系统配置信息=================');
			if (result['status'] === 'success') {
				result['data'].reduce((o1, o2) => {
					o1[o2['item_name']] = o2['item_value'];
					return o1;
				}, pros_dict);
			}
			logger.info('=================加载系统配置信息完成=================');
		});

		/**
		 *
		 * @param key
		 */
		this.get_property = (key) => {
			return pros_dict[key] || null;
		}
	}
}

module.exports = new SystemConfig();