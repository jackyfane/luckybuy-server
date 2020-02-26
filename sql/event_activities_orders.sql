DROP EVENT IF EXISTS event_activities_orders;
CREATE DEFINER = onefrt@`%` EVENT event_activities_orders ON SCHEDULE
	EVERY '1' MINUTE
		STARTS date_format(now(), '%Y-%m-%d %H:%i') + INTERVAL 1 MINUTE
	ENABLE
	DO
	BEGIN

		DECLARE v_hand_temp INT DEFAULT -1; -- 拼手气临时变量
		DECLARE v_hand_id INT DEFAULT NULL; -- 拼手气ID
		DECLARE v_person_num INT DEFAULT NULL; -- 拼手气限制参与人数
		DECLARE v_finish_time DATETIME DEFAULT NULL; -- 拼手气结束时间
		DECLARE v_end_time DATETIME DEFAULT NULL; -- 拼手气截止时间
		DECLARE v_order_id VARCHAR(64) DEFAULT NULL;-- 订单ID
		DECLARE v_order_status VARCHAR(4) DEFAULT NULL; -- 订单状态
		DECLARE v_goods_id INT DEFAULT NULL; -- 商品ID
		DECLARE v_goods_num INT DEFAULT NULL;-- 购买的商品份数
		DECLARE v_payed_cnt INT DEFAULT NULL; -- 已支付的订单量
		DECLARE v_reason VARCHAR(50) DEFAULT NULL; -- 原因
		DECLARE v_merchant_id INT DEFAULT NULL; -- 商家ID
		DECLARE v_merchant_income INT DEFAULT NULL; -- 商家收入

		DECLARE done INT DEFAULT FALSE;

		-- 支付超时订单
		DECLARE v_payed_ot_cursor CURSOR FOR
			SELECT DISTINCT so.order_id, '11' AS status_code, '支付超时' AS reason
			FROM spell_order so,
				 order_status os
			WHERE so.status = '01'
			  AND so.status = os.status_code
			  AND so.order_id = os.order_id
			  AND os.status_expired < now();

		-- 完成抽奖的拼手气和拼手气活动失败但已支付的订单
		DECLARE v_sh_cursor CURSOR FOR
			SELECT sh.goods_id,
				   sh.hand_id,
				   sh.person_num,
				   sh.finish_time,
				   sh.end_time,
				   o.order_id,
				   o.status,
				   o.goods_num,
				   t.payed_cnt
			FROM goods g
					 JOIN spell_hand sh ON g.goods_id = sh.goods_id
					 JOIN
				 spell_order o ON sh.hand_id = o.hand_id
					 JOIN
				 (SELECT hand_id, count(1) AS payed_cnt
				  FROM spell_order s
				  WHERE s.status = (SELECT item_value FROM system_config WHERE item_name = 'luck_order_refund_status')
				  GROUP BY hand_id) t ON t.hand_id = o.hand_id
			WHERE sh.start_time <= now()                                                                         -- 进行中的拼手气活动
			  AND ((sh.person_num = t.payed_cnt
				AND sh.finish_time IS NOT NULL
				AND sh.status IN (0, 100)
				AND sh.free_num = (SELECT coalesce(sum(p.pay_charge) / g.promote_price, 0)
								   FROM payment p
								   WHERE p.pay_type = 3
									 AND p.hand_id = sh.hand_id)
					   ) -- 000：无抽奖，100：已派奖
				OR sh.end_time < now())                                                                          -- 超时未成团的拼手气
			  AND o.status = (SELECT item_value FROM system_config WHERE item_name = 'luck_order_refund_status') -- 配置的订单派奖状态
			ORDER BY sh.hand_id ASC;

		-- 待发货和待收货订单
		DECLARE v_order_cursor CURSOR FOR
			SELECT o.order_id, o.status
			FROM spell_order o
					 INNER JOIN order_status os ON os.order_id = o.order_id AND os.status_code = o.status
					 INNER JOIN status s ON s.status_code = os.status_code
			WHERE o.status IN ('21', '22') -- 21.待发货；22.待收货
			  AND os.status_expired <= now();

		-- 商家收入入账
		DECLARE v_income_cursor CURSOR FOR
			SELECT m.user_id, f.hand_id, f.merchant_fee
			FROM (SELECT hand_id, count(1) cnt FROM spell_order WHERE status = '23' GROUP BY hand_id) t
					 INNER JOIN spell_hand sh ON t.hand_id = sh.hand_id
					 INNER JOIN fee_detail f ON sh.hand_id = f.hand_id
					 INNER JOIN goods g ON sh.goods_id = g.goods_id
					 INNER JOIN merchant m ON m.merchant_id = g.merchant_id
			WHERE sh.person_num = t.cnt -- 已收货的订单量与实际订单数量相等，才能入账
			  AND f.merchant_fee > 0
			  AND (f.status IS NULL OR f.status <> 100);

		DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

		#         ******************************************************************
		#         支付超时
		#             1、回滚商品库存和销量
		#             2、回滚拼手气参与人数
		#             3、更新订单状态为支付超时
		#         ******************************************************************

		DECLARE EXIT HANDLER FOR SQLEXCEPTION
			BEGIN
				INSERT INTO event_log(title, content) VALUE (@title, @error_info);
			END;

		#             1、回滚商品销量
		SET @title = 'v_payed_ot_cursor';
		SET @error_info = '支付超时，商品库存和销量数据回滚失败';
		UPDATE goods g, (SELECT t.goods_id, sum(t.goods_num) AS saled_number
						 FROM (SELECT sh.goods_id, sh.hand_id, sum(so.goods_num) AS goods_num
							   FROM spell_hand sh,
									spell_order so,
									order_status os
							   WHERE sh.hand_id = so.hand_id
								 AND so.order_id = os.order_id
								 AND so.status = os.status_code
								 AND os.status_expired < now()
								 AND so.status = '01'
							   GROUP BY sh.goods_id, sh.hand_id) AS t
						 GROUP BY t.goods_id) tmp
		SET g.saled_number = g.saled_number - tmp.saled_number,-- 销售量
			g.goods_number = g.goods_number + tmp.saled_number -- 库存量
		WHERE g.goods_id = tmp.goods_id;

		#             2、回滚拼手气参与人数
		SET @error_info = '支付超时，参与人数回滚失败';
		UPDATE spell_hand sh, (SELECT so.hand_id, count(so.hand_id) outtime_cnt
							   FROM spell_order so,
									order_status os
							   WHERE so.status = '01'
								 AND so.status = os.status_code
								 AND so.order_id = os.order_id
								 AND os.status_expired < now()
							   GROUP BY hand_id) o
		SET sh.spelled_num = sh.spelled_num - o.outtime_cnt
		WHERE sh.hand_id = o.hand_id;

		#        3、更新订单状态为支付超时, 由于order_status存在触发器，不可以从本身select后再INSERT，因此只能通过游标取数据进行INSERT
		SET @title = 'v_payed_ot_cursor';
		OPEN v_payed_ot_cursor;
		v_payed_ot_loop:
			LOOP
				FETCH v_payed_ot_cursor INTO v_order_id, v_order_status, v_reason;
				IF done THEN
					LEAVE v_payed_ot_loop;
				END IF;
				SET @error_info = concat('支付超时，订单[', v_order_id, ']状态[', v_order_status, ']更新失败');
				INSERT INTO order_status(order_id, status_code, reason) VALUE (v_order_id, v_order_status, v_reason);
			END LOOP;
		CLOSE v_payed_ot_cursor;

		#         ******************************************************************
		#         1、拼手气监控处理
		#         如果spell_hand中finish_time不为空且status='100'，表示拼手气成团且完成了抽奖，进入待发货状态
		#         如果spell_hand中finish_time为空且end_time<now()，表示拼手气超时，需要获取已支付的订单将其状态更新为退款中，由后台监听程序进行扫描并退款
		#         ******************************************************************
		SET @title = 'v_sh_cursor';
		SET done = FALSE;
		OPEN v_sh_cursor;
		v_sh_loop:
			LOOP
				SET @error_info = '没有数据';
				FETCH v_sh_cursor INTO v_goods_id, v_hand_id, v_person_num, v_finish_time, v_end_time, v_order_id, v_order_status, v_goods_num, v_payed_cnt;
				IF done THEN
					LEAVE v_sh_loop;
				END IF;
				IF v_person_num = v_payed_cnt THEN
					-- 增加订单待发货状态
					SET @error_info = concat('拼手气[', v_hand_id, ']拼团成功，[', v_order_id, ']订单状态更新为"待发货"失败');
					INSERT INTO order_status(order_id, status_code, reason) VALUE (v_order_id, '21', '拼手气活动拼团成功');
				ELSE
					-- 日志
					SET @error_info = concat('拼手气[', v_hand_id, ']拼团失败，[', v_order_id, ']订单回滚商品库存和销量异常');
					-- 1、通过订单ID逐条更新回滚商品库存及销量
					UPDATE goods g
					SET g.goods_number = g.goods_number + v_goods_num,
						g.saled_number = g.saled_number - v_goods_num
					WHERE g.goods_id = v_goods_id;

					SET @error_info = concat('拼手气[', v_hand_id, ']拼团失败，[', v_order_id, ']订单更新状态为"退款中"失败');
					-- 增加订单退款中状态
					INSERT INTO order_status(order_id, status_code, reason) VALUE (v_order_id, '30', '拼手气活动拼团失败');
				END IF;
			END LOOP;
		CLOSE v_sh_cursor;

		#         ******************************************************************
		#         2、待发货订单处理
		#         如果在限定的时间（status_expired，如果商家延长发货时间(is_delayed=true)，
		#         则需要加上系统配置的延长时长）内商家未发货，将订单状态修改为商家取消订单
		#         ******************************************************************
		#         3、待收货订单处理：
		#         如果在限定的时间（status_expired，如果拼客延长收货时间(is_delayed=true)，
		#         则需要加上系统配置的延长时长）内拼客未确认收货，将订单状态修改为已收货
		#         ******************************************************************
		SET @title = 'v_order_cursor';
		SET done = FALSE;
		OPEN v_order_cursor;
		v_loop:
			LOOP
				SET @error_info = '没有数据';
				FETCH v_order_cursor INTO v_order_id, v_order_status;
				IF done THEN
					LEAVE v_loop;
				END IF;

				IF v_order_status = '21' THEN
					-- 增加订单状态退款处理中
					-- 根据当前需求，暂时修改为待收货状态，后面再根据情况修改为退款中
					SET @error_info = concat('[', v_order_id, ']订单更新状态为"待收货"失败');
					#                     INSERT INTO order_status(order_id, status_code, reason) VALUE (v_order_id, '30', '商家发货超时，系统自动取消订单');
					INSERT INTO order_status(order_id, status_code, reason) VALUE (v_order_id, '22', '商家发货超时，系统自动确认已发货并将状态修改为待收货');
				ELSE
					SET @error_info = concat('[', v_order_id, ']订单更新状态为"已收货"失败');
					-- 增加订单状态：确认收货
					INSERT INTO order_status(order_id, status_code, reason) VALUE (v_order_id, '23', '用户收货超时，系统自动确认收货');

				END IF;
			END LOOP;
		CLOSE v_order_cursor;

		#         ******************************************************************
		#         商家收入入账
		#         ******************************************************************
		SET @title = 'v_income_cursor';
		SET done = FALSE;
		OPEN v_income_cursor;
		v_loop:
			LOOP
				SET @error_info = '没有数据';
				FETCH v_income_cursor INTO v_merchant_id, v_hand_id, v_merchant_income;
				IF done THEN
					LEAVE v_loop;
				END IF;
				IF (SELECT total_amount FROM account_merchant WHERE user_id = v_merchant_id) IS NULL THEN
				    SET @error_info = '入账失败';
					INSERT INTO account_merchant(user_id, total_amount) VALUES (v_merchant_id, v_merchant_income);
				ELSE
				    SET @error_info = '账户金额更新失败';
					UPDATE account_merchant
					SET total_amount = total_amount + v_merchant_income
					WHERE user_id = v_merchant_id;
				END IF;

				SET @error_info = '状态更新失败';
				-- 将状态设置为已入账
				UPDATE fee_detail f SET f.status = 100 WHERE f.hand_id = v_hand_id;

			END LOOP;
		CLOSE v_income_cursor;
	END;