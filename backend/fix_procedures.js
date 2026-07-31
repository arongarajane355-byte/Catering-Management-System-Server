const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixProcedures() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'cms_db',
    password: process.env.DB_PASS !== undefined ? process.env.DB_PASS : 'cms_db',
    database: process.env.DB_NAME || 'cms',
    multipleStatements: false
  });

  // DROP statements use semicolons (they are simple statements)
  const drops = [
    'DROP PROCEDURE IF EXISTS sp_get_services_by_category',
    'DROP PROCEDURE IF EXISTS sp_create_customer_account',
    'DROP PROCEDURE IF EXISTS sp_verify_customer_account',
    'DROP PROCEDURE IF EXISTS sp_create_booking',
    'DROP PROCEDURE IF EXISTS sp_add_booking_item',
    'DROP PROCEDURE IF EXISTS sp_update_booking_status',
    'DROP PROCEDURE IF EXISTS sp_record_payment',
    'DROP PROCEDURE IF EXISTS sp_admin_dashboard_summary',
  ];

  for (const drop of drops) {
    await conn.query(drop);
    console.log('Dropped:', drop.split(' ').pop());
  }

  // CREATE PROCEDURE bodies — no semicolons inside BEGIN...END, no trailing semicolons
  // mysql2 sends these as-is and MySQL parses the whole thing
  const creates = [
    `CREATE PROCEDURE sp_get_services_by_category()
BEGIN
  SELECT
    c.category_id,
    c.category_name,
    c.description AS category_description,
    s.service_id,
    s.service_name,
    s.description AS service_description,
    s.base_price,
    s.unit,
    s.image_url
  FROM service_categories c
  JOIN services s ON s.category_id = c.category_id
  WHERE c.is_active = TRUE AND s.is_active = TRUE
  ORDER BY c.category_id, s.service_name
END`,

    `CREATE PROCEDURE sp_create_customer_account(
  IN p_firstname      VARCHAR(50),
  IN p_lastname       VARCHAR(50),
  IN p_gender         VARCHAR(10),
  IN p_age            INT,
  IN p_contact_number VARCHAR(20),
  IN p_email          VARCHAR(100),
  IN p_password_hash  VARCHAR(255),
  IN p_staff_id       INT
)
BEGIN
  INSERT INTO users (firstname, lastname, gender, age, contact_number, email, password, role, account_status, created_by)
  VALUES (p_firstname, p_lastname, p_gender, p_age, p_contact_number, p_email, p_password_hash, 'customer', 'pending', p_staff_id)
  ;
  INSERT INTO notifications (user_id, message)
  SELECT user_id, CONCAT('New customer account "', p_firstname, ' ', p_lastname, '" awaiting verification.')
  FROM users WHERE role = 'admin'
  ;
  SELECT LAST_INSERT_ID() AS new_user_id
  ;
END`,

    `CREATE PROCEDURE sp_verify_customer_account(
  IN p_user_id  INT,
  IN p_admin_id INT,
  IN p_action   VARCHAR(10),
  IN p_remarks  VARCHAR(255)
)
BEGIN
  UPDATE users
  SET account_status = IF(p_action = 'approved', 'verified', 'rejected')
  WHERE user_id = p_user_id AND role = 'customer'
  ;
  INSERT INTO verification_logs (user_id, reviewed_by, action, remarks)
  VALUES (p_user_id, p_admin_id, p_action, p_remarks)
  ;
END`,

    `CREATE PROCEDURE sp_create_booking(
  IN p_customer_id   INT,
  IN p_event_type    VARCHAR(100),
  IN p_event_date    DATE,
  IN p_venue_address VARCHAR(255),
  IN p_guest_count   INT
)
BEGIN
  INSERT INTO bookings (customer_id, event_type, event_date, venue_address, guest_count, status)
  VALUES (p_customer_id, p_event_type, p_event_date, p_venue_address, p_guest_count, 'pending')
  ;
  SELECT LAST_INSERT_ID() AS new_booking_id
  ;
END`,

    `CREATE PROCEDURE sp_add_booking_item(
  IN p_booking_id INT,
  IN p_service_id INT,
  IN p_quantity   INT
)
BEGIN
  DECLARE v_price DECIMAL(10,2)
  ;
  SELECT base_price INTO v_price FROM services WHERE service_id = p_service_id
  ;
  INSERT INTO booking_items (booking_id, service_id, quantity, unit_price, subtotal)
  VALUES (p_booking_id, p_service_id, p_quantity, v_price, v_price * p_quantity)
  ;
  UPDATE bookings b
  SET total_amount = (SELECT COALESCE(SUM(subtotal), 0) FROM booking_items WHERE booking_id = p_booking_id)
  WHERE b.booking_id = p_booking_id
  ;
END`,

    `CREATE PROCEDURE sp_update_booking_status(
  IN p_booking_id INT,
  IN p_status     VARCHAR(20),
  IN p_staff_id   INT
)
BEGIN
  UPDATE bookings
  SET status = p_status, handled_by = COALESCE(p_staff_id, handled_by)
  WHERE booking_id = p_booking_id
  ;
END`,

    `CREATE PROCEDURE sp_record_payment(
  IN p_booking_id     INT,
  IN p_amount_paid    DECIMAL(10,2),
  IN p_payment_method VARCHAR(20),
  IN p_reference_no   VARCHAR(100),
  IN p_recorded_by    INT
)
BEGIN
  DECLARE v_total DECIMAL(10,2)
  ;
  DECLARE v_paid DECIMAL(10,2)
  ;
  INSERT INTO payments (booking_id, amount_paid, payment_method, reference_no, recorded_by)
  VALUES (p_booking_id, p_amount_paid, p_payment_method, p_reference_no, p_recorded_by)
  ;
  SELECT total_amount INTO v_total FROM bookings WHERE booking_id = p_booking_id
  ;
  SELECT COALESCE(SUM(amount_paid), 0) INTO v_paid FROM payments WHERE booking_id = p_booking_id
  ;
  SELECT v_total AS total_amount, v_paid AS total_paid, (v_total - v_paid) AS balance
  ;
END`,

    `CREATE PROCEDURE sp_admin_dashboard_summary()
BEGIN
  SELECT
    (SELECT COUNT(*) FROM users WHERE role = 'customer' AND account_status = 'pending') AS pending_verifications,
    (SELECT COUNT(*) FROM bookings WHERE status = 'pending') AS pending_bookings,
    (SELECT COUNT(*) FROM bookings WHERE status = 'completed') AS completed_bookings,
    (SELECT COALESCE(SUM(amount_paid), 0) FROM payments) AS total_revenue
  ;
END`,
  ];

  for (const create of creates) {
    try {
      await conn.query(create);
      const name = create.match(/CREATE PROCEDURE (\w+)/)[1];
      console.log('Created:', name);
    } catch (err) {
      console.error('FAILED:', err.message);
    }
  }

  console.log('\nDone! All stored procedures registered.');
  await conn.end();
}

fixProcedures().catch(console.error);
