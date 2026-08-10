-- ============================================================
-- CMS Database Migration: Customer Registration Feature
-- Run this script against the live `cms` database
-- ============================================================

USE `cms`;

-- 1. Add new columns to users table
-- (Only runs if columns don't already exist)
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `middlename` VARCHAR(50) DEFAULT NULL AFTER `lastname`,
  ADD COLUMN IF NOT EXISTS `customer_no` VARCHAR(20) DEFAULT NULL AFTER `user_id`;

-- Add unique index for customer_no (only if not exists)
ALTER TABLE `users`
  ADD UNIQUE KEY IF NOT EXISTS `customer_no` (`customer_no`);

-- 2. Backfill customer_no for existing customer accounts
UPDATE `users`
SET `customer_no` = CONCAT('CUST-', YEAR(`created_at`), '-', LPAD(`user_id`, 4, '0'))
WHERE `role` = 'customer' AND `customer_no` IS NULL;

-- 3. Drop and recreate sp_create_customer_account
DROP PROCEDURE IF EXISTS `sp_create_customer_account`;

DELIMITER $$
CREATE DEFINER=`cms_db`@`%` PROCEDURE `sp_create_customer_account`(
  IN p_firstname VARCHAR(50),
  IN p_lastname VARCHAR(50),
  IN p_middlename VARCHAR(50),
  IN p_gender VARCHAR(10),
  IN p_age INT,
  IN p_contact_number VARCHAR(20),
  IN p_email VARCHAR(100),
  IN p_password_hash VARCHAR(255),
  IN p_staff_id INT,
  IN p_customer_no VARCHAR(20)
)
BEGIN
  DECLARE new_id INT;
  DECLARE v_cust_no VARCHAR(20);

  IF p_customer_no IS NOT NULL AND p_customer_no != '' THEN
    SET v_cust_no = p_customer_no;
  ELSE
    SET v_cust_no = NULL;
  END IF;

  INSERT INTO users (customer_no, firstname, middlename, lastname, gender, age, contact_number, email, password, role, account_status, created_by)
  VALUES (v_cust_no, p_firstname, p_middlename, p_lastname, p_gender, p_age, p_contact_number, p_email, p_password_hash, 'customer', 'pending', p_staff_id);

  SET new_id = LAST_INSERT_ID();

  IF v_cust_no IS NULL THEN
    SET v_cust_no = CONCAT('CUST-', YEAR(NOW()), '-', LPAD(new_id, 4, '0'));
    UPDATE users SET customer_no = v_cust_no WHERE user_id = new_id;
  END IF;

  INSERT INTO notifications (user_id, message)
    SELECT user_id, CONCAT('New customer account "', p_firstname, ' ', p_lastname, '" awaiting verification.')
    FROM users WHERE role = 'admin';

  SELECT new_id AS new_user_id, v_cust_no AS customer_no;
END $$
DELIMITER ;

-- 4. Drop and recreate sp_verify_customer_account
DROP PROCEDURE IF EXISTS `sp_verify_customer_account`;

DELIMITER $$
CREATE DEFINER=`cms_db`@`%` PROCEDURE `sp_verify_customer_account`(
  IN p_user_id INT,
  IN p_admin_id INT,
  IN p_action VARCHAR(10),
  IN p_remarks VARCHAR(255),
  IN p_new_password_hash VARCHAR(255)
)
BEGIN
  IF p_action = 'approved' AND p_new_password_hash IS NOT NULL AND p_new_password_hash != '' THEN
    UPDATE users SET account_status = 'verified', password = p_new_password_hash WHERE user_id = p_user_id AND role = 'customer';
  ELSE
    UPDATE users SET account_status = IF(p_action = 'approved', 'verified', 'rejected') WHERE user_id = p_user_id AND role = 'customer';
  END IF;
  INSERT INTO verification_logs (user_id, reviewed_by, action, remarks) VALUES (p_user_id, p_admin_id, p_action, p_remarks);
END $$
DELIMITER ;

-- Done!
SELECT 'Migration completed successfully.' AS status;
