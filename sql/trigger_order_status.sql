-- 订单状态变更触发器
DROP TRIGGER IF EXISTS trigger_update_status;
CREATE TRIGGER trigger_update_status
    BEFORE INSERT
    ON order_status
    FOR EACH ROW
BEGIN
    #该状态的status_expired为created_time加上duration，duration以分钟作为单位
    DECLARE v_hand_id int DEFAULT NULL;
    DECLARE v_old_status varchar(4) DEFAULT NULL;
    DECLARE v_refund_status varchar(4) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
        BEGIN
            INSERT INTO event_log(title, content) VALUE (@title, @error_info);
        END;

    SET new.status_expired =
            date_add(new.created_time, INTERVAL (SELECT duration FROM status WHERE status_code = new.status_code)
                     MINUTE);
    -- 优惠退款状态
    SET @title = 'trigger_update_status';
    SET @error_info = concat('订单【', new.order_id, '】当前状态【', new.status_code, '】更新异常，目标状态：', v_refund_status);

    -- 已抽奖拼手气
    SELECT sh.hand_id INTO v_hand_id
    FROM spell_hand sh
             JOIN payment p ON sh.hand_id = p.hand_id
    WHERE p.order_id = new.order_id
      AND sh.status = '100'
      AND p.pay_type = 3;

    SET @error_info = concat('拼号：【', v_hand_id, '】订单【', new.order_id, '】当前状态【', new.status_code, '】更新异常');

    -- 优惠退款状态,不同步订单当前状态
    IF v_hand_id IS NULL OR (v_hand_id IS NOT NULL AND new.status_code != '31') THEN
        UPDATE spell_order o SET o.status = new.status_code WHERE order_id = new.order_id;
    END IF;
END;
