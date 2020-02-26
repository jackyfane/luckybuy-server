# 清理全部拼手气数据
UPDATE goods SET SALED_NUMBER = 0 WHERE goods_id IN (SELECT DISTINCT goods_id FROM spell_hand);
DELETE FROM order_status WHERE CREATED_TIME IS NOT NULL;
DELETE FROM payment WHERE PAYED_TIME IS NOT NULL;
DELETE FROM spell_order WHERE CREATED_TIME IS NOT NULL;
DELETE FROM fee_detail WHERE CREATED_TIME IS NOT NULL;
DELETE FROM spell_hand WHERE CREATED_TIME IS NOT NULL;

SELECT * FROM goods WHERE goods_id =1;
SELECT * FROM spell_hand WHERE hand_id=72;

-- 拼手气状态明细
SELECT sh.hand_id,
       sh.goods_id,
       sh.user_id AS header_id,
       sh.status  AS hand_status,
       sh.person_num,
       sh.spelled_num,
       sh.free_num,
       sh.start_time,
       sh.end_time,
       o.order_id,
       os.status_code,
       s.status_name,
       os.status_expired,
       os.is_delayed,
       os.created_time
FROM spell_hand sh
       INNER JOIN spell_order o ON sh.hand_id = o.hand_id
       INNER JOIN order_status os ON os.order_id = o.order_id
       INNER JOIN status s ON s.status_code = os.status_code
# WHERE o.status = 20
ORDER BY o.order_id, os.created_time ASC;

-- 扫描待收发货
SELECT o.order_id,
       o.status #, os.status_expired, os.is_delayed, s.duration
FROM spell_order o
         INNER JOIN order_status os ON os.order_id = o.order_id
         INNER JOIN status s ON s.status_code = os.status_code
WHERE o.status IN ('21', '22') -- 21.待发货；22.待收货
  AND os.status_expired <= now();

-- 扫描进行中的拼手气
SELECT sh.hand_id, sh.person_num, sh.spelled_num, sh.end_time, o.order_id, o.status
FROM spell_hand sh,
     spell_order o
WHERE sh.finish_time IS NULL -- 未结束的拼手气活动
  AND sh.start_time <= now() -- 进行中的拼手气活动
  AND o.status = '20'        -- 已支付，待成团
  AND sh.hand_id = o.hand_id;

-- 退款订单
SELECT `payment`.`pay_id`,
       `payment`.`order_id`,
       `payment`.`hand_id`,
       `payment`.`user_id`,
       `payment`.`pay_charge`,
       `payment`.`pay_type`,
       `payment`.`payed_time`,
       `spell_order`.`order_id` AS `spell_order.order_id`
FROM `payment` AS `payment`
            INNER JOIN `spell_order` AS `spell_order`
                       ON `payment`.`order_id` = `spell_order`.`order_id` AND `spell_order`.`status` = '30'
WHERE `payment`.`pay_type` = '1'
  AND `payment`.`pay_charge` IS NOT NULL;

SELECT o.order_id,
       o.status #, os.status_expired, os.is_delayed, s.duration
FROM spell_order o
         INNER JOIN order_status os ON os.order_id = o.order_id AND o.status = os.status_code
         INNER JOIN status s ON s.status_code = os.status_code
WHERE o.status IN ('21', '22') -- 21.待发货；22.待收货
  AND os.status_expired <= now();

-- 根据订单回滚库存销量
UPDATE goods g
SET g.saled_number = g.saled_number - (SELECT goods_num FROM spell_order WHERE order_id='20190327004006d01e0df5')
WHERE goods_id IN (
  SELECT goods_id
  FROM spell_hand sh
         INNER JOIN spell_order so ON sh.hand_id = so.hand_id
  WHERE so.order_id = '20190327004006d01e0df5'
);

-- 待付款订单购买的商品总量
SELECT t.goods_id, sum(t.goods_num)
FROM (
         SELECT sh.goods_id, sh.hand_id, sum(DISTINCT so.goods_num) AS goods_num
         FROM spell_hand sh,
              spell_order so,
              order_status os
         WHERE sh.hand_id = so.hand_id
           AND so.order_id = os.order_id
           AND os.status_expired < now()
           AND so.status = '01'
         GROUP BY sh.goods_id, sh.hand_id) AS t
GROUP BY t.goods_id;

SELECT goods_id
  FROM spell_hand sh
         INNER JOIN spell_order so ON sh.hand_id = so.hand_id
  WHERE so.order_id = '20190327004006d01e0df5';

SELECT * FROM order_status WHERE ORDER_ID = '20190327004006d01e0df5';
SELECT * FROM spell_order WHERE order_id = '20190327004006d01e0df5';
SELECT * FROM spell_hand WHERE hand_id = 64;

SELECT * FROM spell_order WHERE hand_id = 64;
SELECT * from goods WHERE goods_id=1;

SELECT * FROM goods;
SELECT * FROM system_config;
SELECT * FROM event_log;
SELECT * FROM fee_detail;

DROP TABLE  account_header;
DROP TABLE account_merchant;
DROP TABLE withdraw_detail;
CREATE TABLE account_header
(
    user_id          BIGINT(20) NOT NULL COMMENT '用户ID' PRIMARY KEY,
    total_amount     BIGINT(20) NOT NULL COMMENT '账户总金额',
    total_withdraw   BIGINT(20)          DEFAULT 0 COMMENT '提现总金额',
    updated_time     DATETIME   NOT NULL DEFAULT current_timestamp ON UPDATE current_timestamp,
    created_time     DATETIME            DEFAULT now() COMMENT '账户创建时间'
) COMMENT '拼头账务汇总表';

CREATE TABLE account_merchant
(
    user_id          BIGINT(20) NOT NULL COMMENT '用户ID' PRIMARY KEY,
    total_amount     BIGINT(20) NOT NULL COMMENT '账户总金额',
    total_withdraw   BIGINT(20)          DEFAULT 0 COMMENT '提现总金额',
    updated_time     DATETIME   NOT NULL DEFAULT current_timestamp ON UPDATE current_timestamp,
    created_time     DATETIME            DEFAULT now() COMMENT '账户创建时间'
) COMMENT '商家账务汇总表';


CREATE TABLE withdraw_detail
(
  withdraw_id     varchar(32) PRIMARY KEY COMMENT '提现ID',
  withdraw_from   varchar(30) NOT NULL COMMENT '提现来源',
  withdraw_to     BIGINT(20)  NOT NULL COMMENT '提现用户，USER_ID',
  withdraw_amount int(10)     NOT NULL COMMENT '提现金额',
  created_time    datetime DEFAULT now() COMMENT '提现时间'
) COMMENT '提现明细';


ALTER TABLE account_header ADD CONSTRAINT header_user_fk FOREIGN KEY (user_id) REFERENCES User(user_id);
ALTER TABLE account_merchant ADD CONSTRAINT merchant_user_fk FOREIGN KEY (user_id) REFERENCES User(user_id);
ALTER TABLE withdraw_detail ADD CONSTRAINT user_withdraw_fk FOREIGN KEY (withdraw_to) REFERENCES User(user_id);


-- 商家收入入账
SELECT g.merchant_id, f.hand_id, f.merchant_fee
FROM (SELECT hand_id, count(1) cnt FROM spell_order WHERE status = '23' GROUP BY hand_id) t
		 LEFT JOIN spell_hand sh ON t.hand_id = sh.hand_id
		 LEFT JOIN fee_detail f ON sh.hand_id = f.hand_id
		 LEFT JOIN goods g ON sh.goods_id = g.goods_id
WHERE sh.person_num = t.cnt
  AND f.merchant_fee > 0
  AND (f.status IS NULL OR f.status <> 100);

-- 商家入账金额
SELECT m.user_id, sum(f.merchant_fee)
FROM (SELECT hand_id, count(1) cnt FROM spell_order WHERE status = '23' GROUP BY hand_id) t
		 INNER JOIN spell_hand sh ON t.hand_id = sh.hand_id
		 INNER JOIN fee_detail f ON sh.hand_id = f.hand_id
		 INNER JOIN goods g ON sh.goods_id = g.goods_id
		 INNER JOIN merchant m ON m.merchant_id = g.merchant_id
WHERE sh.person_num = t.cnt -- 已收货的订单量与实际订单数量相等，才能入账
  AND f.merchant_fee > 0
  AND (f.status IS NULL OR f.status <> 100) GROUP BY m.USER_ID;

-- 商家出售商品入账明细
SELECT f.total_cost, f.sp_fee, f.header_fee, f.discount_fee, f.merchant_fee
FROM merchant m,
     goods g,
     spell_hand sh,
     fee_detail f
WHERE m.merchant_id = g.merchant_id
  AND g.goods_id = sh.goods_id
  AND sh.hand_id = f.hand_id
  AND m.user_id = 5;

-- 拼头提成入账明细
SELECT f.total_cost, concat(format(g.commission_rate * 100, 0), '%') commission_rate, f.header_fee
FROM goods g,
     spell_hand sh,
     fee_detail f
WHERE sh.goods_id = g.goods_id
  AND sh.hand_id = f.hand_id
  AND sh.user_id = 5;
