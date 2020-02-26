const express = require('express');
const router = express.Router();
const controllers = require('../controllers');
const appconf = require('../wxpay-api/cfg');
const pay_utils = require('../wxpay-api/utils');
const path = require('path');


/**
 * distribute job
 * @param req
 * @param res
 * @param next
 */
let distributeJob = function (req, res, next) {

	let modelName = req.params.controller;
	if (modelName === "favicon.ico") return;
	let action = req.params.action;

	//1、付退款通知的拦截处理
	if (req.url.endsWith('payment_notify') || req.url.endsWith('refund_notify')) {
		try {
			const appid = pay_utils.xml2js(req.body).appid
			if (!appid || appid != appconf.appid) {
				return no_permission(req, res);
			}
		} catch (e) {
			return no_permission(req, res);
		}
	} else {
		//2、普通请求的拦截处理
		const {referer: referer, 'user-agent': useragent} = req.headers
		if (!referer || referer.includes(appconf.appid) == -1 || !useragent || useragent.includes('MicroMessenger') == -1) {
			return no_permission(req, res);
		}
	}

	if (/\d+/.test(action)) {
		req.params.id = action;
		action = 'detail';
	}

	let Controller = controllers[modelName];

	if (!Controller) { // controller not exists.....
		notFound(req, res);
		return;
	}

	let controller = new Controller(modelName);
	let func = controller[action];
	if (!func) { // function not exists
		notFound(req, res);
		return;
	}

	//deal with business
	func(req, res, next);
}

notFound = (req, res) => {
	res.json({
		status: 404,
		message: `Your request is not found: ${req.url}`
	});
	return;
};

no_permission = (req, res) => {
	res.json({
		status: 601,
		message: 'You have no permission to view.'
	})
}

/* GET home page. */
router.get("/", function (req, res, next) {
	res.send('Hello， SpellHand！');
});

/* Action for a single item */
router.get('/controller/:controller', function (req, res, next) {
	req.params.action = "list";
	distributeJob(req, res, next);
	// res.redirect(path.join(req.path, 'list'));
});

router.post('/controller/:controller', function (req, res, next) {
	req.params.action = "list";
	distributeJob(req, res, next);
});

router.get('/controller/:controller/:action', distributeJob);
/* POST For create or update action */
router.post('/controller/:controller/:action', distributeJob);
router.get('/controller/:controller/:id/:action', distributeJob);
router.post('/controller/:controller/:id/:action', distributeJob);


module.exports = router;