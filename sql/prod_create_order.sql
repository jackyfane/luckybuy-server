DROP PROCEDURE IF EXISTS prod_create_order;
CREATE
    DEFINER = onefrt@`%` PROCEDURE prod_create_order(IN i_order_id varchar(64), IN i_pay_id varchar(64),
                                                     IN i_hand_id int,
                                                     IN i_user_id int, IN i_addr_id int, IN i_goods_num int,
                                                     IN i_goods_id int)
BEGIN

    -- 拼手气活动属性 --
    DECLARE v_person_num INT; -- 可参与人数
    DECLARE v_spelled_num INT DEFAULT 0; -- 已参与人数
    DECLARE v_curr_time DATETIME; -- 当前时间变量
    DECLARE v_start_time DATETIME; -- 拼手气开始时间
    DECLARE v_finish_time DATETIME; -- 拼手气结束时间
    DECLARE v_end_time DATETIME; -- 拼手气截止时间
    DECLARE v_order_id VARCHAR(64);
    -- 订单ID

    -- 商品属性 --
    DECLARE v_goods_num INT; -- 商品库存量
    DECLARE v_saled_num INT DEFAULT 0; -- 销售量
    DECLARE v_market_price INT; -- 市场价
    DECLARE v_promote_price INT DEFAULT 0;
    -- 促销价格

    -- 返回的结果参数 --
    DECLARE v_open_id VARCHAR(64) DEFAULT NULL;
    DECLARE v_pay_charge INT DEFAULT 0;
    DECLARE v_pay_effected varchar(30) DEFAULT NULL; -- 支付生效时间
    DECLARE v_pay_expired varchar(30) DEFAULT NULL; -- 支付失效时间
    DECLARE v_result VARCHAR(50) DEFAULT NULL;
    DECLARE v_status_code varchar(4) DEFAULT NULL;

    DECLARE done INT DEFAULT FALSE;
    -- 此变量必须在游标之前定义，然后在定义游标之后定义其找不到数据时的处理，以便退出循环

    -- 查询拼手气成功支付的订单
    DECLARE v_cur CURSOR FOR
        SELECT o.order_id
        FROM spell_order o
                 INNER JOIN payment p ON o.order_id = p.order_id
        WHERE o.hand_id = i_hand_id
          AND o.hand_id = p.hand_id
          AND o.status = '10' -- 支付成功订单
          AND p.pay_type = 1; -- 支付类型

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    -- 查询拼手气活动信息
    SELECT sh.person_num,
           sh.spelled_num,
           sh.start_time,
           sh.finish_time,
           sh.end_time
           INTO v_person_num, v_spelled_num, v_start_time, v_finish_time, v_end_time
    FROM spell_hand sh
    WHERE sh.hand_id = i_hand_id
    LIMIT 0, 1;

    -- 查询商品信息
    SELECT g.goods_number,
           g.saled_number,
           g.market_price,
           g.promote_price
           INTO v_goods_num, v_saled_num, v_market_price, v_promote_price
    FROM goods g
    WHERE g.goods_id = i_goods_id
    LIMIT 0, 1;

    -- 获取系统当前时间
    SET v_curr_time = now();
    SET v_saled_num = coalesce(v_saled_num, 0) + i_goods_num;

    IF v_promote_price IS NULL OR v_promote_price <= 0 THEN
        SET v_promote_price = v_market_price;
    END IF;

    IF v_start_time > v_curr_time THEN
        SET v_result = '活动尚未开始';
    ELSEIF v_finish_time IS NOT NULL THEN
        SET v_result = '活动已经结束';
    ELSEIF v_person_num = v_spelled_num THEN
        #         IF v_curr_time <= v_end_time THEN
#             -- 更新拼手气的结束时间为当前时间
#             UPDATE spell_hand sh SET sh.finish_time = v_curr_time WHERE sh.hand_id = i_hand_id;
#             -- 待发货
#             SET v_status_code = '21';
#             SET v_result = '拼手气活动拼团成功，等待发货';
#         ELSE
        IF v_curr_time > v_end_time THEN
            -- 退款中
            SET v_status_code = '30';
            SET v_result = '拼手气活动拼团失败，退款中';
        END IF;

        OPEN v_cur;
        v_loop:
            LOOP
                FETCH v_cur INTO v_order_id;
                IF done THEN
                    LEAVE v_loop;
                END IF;
                INSERT INTO order_status(order_id, status_code, reason) VALUE (v_order_id, v_status_code, v_result);
            END LOOP;
        -- 关闭游标
        CLOSE v_cur;

        SET v_result = '参与人数已满';

    ELSEIF v_curr_time > v_end_time THEN
        -- 更新拼手气结束时间
        #         UPDATE spell_hand sh SET sh.finish_time = v_curr_time WHERE sh.hand_id = hand_id;

        -- 状态修改为退款中
        OPEN v_cur;
        v_loop:
            LOOP
                FETCH v_cur INTO v_order_id;
                IF done THEN
                    LEAVE v_loop;
                END IF;
                INSERT INTO order_status(order_id, status_code, reason) VALUE (v_order_id, '30', '拼手气活动超时，拼团失败，退款中');
            END LOOP;
        -- 关闭游标
        CLOSE v_cur;

        SET v_result = '拼手气活动超时，拼团失败';

    ELSEIF v_goods_num < v_saled_num THEN
        -- 更新拼手气结束时间
        #         UPDATE spell_hand sh SET sh.finish_time = v_curr_time WHERE sh.hand_id = hand_id;

        -- 状态修改为退款中
        OPEN v_cur;
        v_loop:
            LOOP
                FETCH v_cur INTO v_order_id;
                IF done THEN
                    LEAVE v_loop;
                END IF;
                INSERT INTO order_status(order_id, status_code, reason) VALUE (v_order_id, '30', '库存不足，拼手气活动拼团失败');
            END LOOP;
        -- 关闭游标
        CLOSE v_cur;

        SET v_result = '库存不足';

    ELSE

        -- 创建订单
        INSERT INTO spell_order(order_id, hand_id, user_id, addr_id, goods_num) VALUE (i_order_id, i_hand_id, i_user_id, i_addr_id, i_goods_num);
        -- 创建订单状态:“创建拼手气订单”
        INSERT INTO order_status(order_id, status_code, reason) VALUE (i_order_id, '00', '参与拼手气活动');
        -- 更新拼手气参与人数
        UPDATE spell_hand sh SET sh.spelled_num = coalesce(sh.spelled_num, 0) + 1 WHERE sh.hand_id = i_hand_id;
        -- 更新商品库存和销售量
        UPDATE goods g
        SET g.goods_number = v_goods_num - i_goods_num,
            g.saled_number = v_saled_num
        WHERE g.goods_id = i_goods_id;

        -- 查询用户open_id
        SELECT open_id INTO v_open_id FROM user WHERE user_id = i_user_id;

        -- 根据促销价格并计算用户需要支付的金额
        SELECT v_promote_price * i_goods_num INTO v_pay_charge FROM goods WHERE goods_id = i_goods_id;

        -- 创建支付信息
        INSERT INTO payment(pay_id, order_id, hand_id, user_id, pay_charge, pay_type, pay_desc) VALUE (i_pay_id,
                                                                                                       i_order_id,
                                                                                                       i_hand_id,
                                                                                                       i_user_id,
                                                                                                       v_pay_charge, 1,
                                                                                                       '参与拼手气活动购买商品费用');
        -- 创建订单状态为“等待支付”
        INSERT INTO order_status(order_id, status_code, reason) VALUE (i_order_id, '01', '参与拼手气活动');

        -- 支付生失效时间
        SELECT date_format(now(), '%Y%m%d%H%i%s'),
               date_format(date_add(now(), INTERVAL duration MINUTE), '%Y%m%d%H%i%s')
               INTO v_pay_effected, v_pay_expired
        FROM status
        WHERE status_code = '01';

    END IF;

    -- 将结果输出
    SELECT v_open_id      AS open_id,
           v_pay_charge   AS pay_charge,
           v_pay_effected AS pay_effected,
           v_pay_expired  AS pay_expired,
           v_result       AS result;
END;

