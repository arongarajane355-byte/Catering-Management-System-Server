const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'cms_db',
  password: process.env.DB_PASS || 'cms_db',
  database: process.env.DB_NAME || 'cms',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true
});

// Helper to initialize database tables, procedures and seed data automatically
async function initDb() {
  let conn;
  try {
    // First connect without specifying database to ensure DB exists
    try {
      const rootConn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'cms_db',
        password: process.env.DB_PASS !== undefined ? process.env.DB_PASS : 'cms_db',
        multipleStatements: true
      });

      await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'cms'}\`;`);
      await rootConn.end();
    } catch (createDbErr) {
      // Ignore if user lacks CREATE DATABASE privilege or DB already exists
    }

    conn = await pool.getConnection();
    console.log('Connected to MySQL database:', process.env.DB_NAME || 'cms');

    // Create tables one by one
    await conn.query(`CREATE TABLE IF NOT EXISTS users (
      user_id         INT AUTO_INCREMENT PRIMARY KEY,
      customer_no     VARCHAR(20) NULL UNIQUE,
      firstname       VARCHAR(50) NOT NULL,
      middlename      VARCHAR(50) NULL,
      lastname        VARCHAR(50) NOT NULL,
      gender          ENUM('Male','Female','Other') NOT NULL,
      age             INT NOT NULL,
      contact_number  VARCHAR(20) NOT NULL,
      email           VARCHAR(100) NOT NULL UNIQUE,
      password        VARCHAR(255) NOT NULL,
      role            ENUM('customer','staff','admin') NOT NULL DEFAULT 'customer',
      account_status  ENUM('pending','verified','rejected','active','inactive') NOT NULL DEFAULT 'active',
      created_by      INT NULL,
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);

    // Ensure middlename and customer_no columns exist if users table already existed
    try {
      await conn.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS middlename VARCHAR(50) NULL AFTER firstname`);
    } catch (e) { }
    try {
      await conn.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS customer_no VARCHAR(20) NULL UNIQUE AFTER user_id`);
    } catch (e) { }

    await conn.query(`CREATE TABLE IF NOT EXISTS verification_logs (
      log_id        INT AUTO_INCREMENT PRIMARY KEY,
      user_id       INT NOT NULL,
      reviewed_by   INT NOT NULL,
      action        ENUM('approved','rejected') NOT NULL,
      remarks       VARCHAR(255) NULL,
      action_date   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_vl_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      CONSTRAINT fk_vl_admin FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE CASCADE
    )`);

    await conn.query(`CREATE TABLE IF NOT EXISTS service_categories (
      category_id   INT AUTO_INCREMENT PRIMARY KEY,
      category_name VARCHAR(100) NOT NULL UNIQUE,
      description   VARCHAR(255),
      is_active     BOOLEAN DEFAULT TRUE,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await conn.query(`CREATE TABLE IF NOT EXISTS services (
      service_id   INT AUTO_INCREMENT PRIMARY KEY,
      category_id  INT NOT NULL,
      service_name VARCHAR(150) NOT NULL,
      description  VARCHAR(500),
      base_price   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      unit         VARCHAR(30) DEFAULT 'package',
      image_url    VARCHAR(255),
      is_active    BOOLEAN DEFAULT TRUE,
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_services_category FOREIGN KEY (category_id) REFERENCES service_categories(category_id) ON DELETE CASCADE
    )`);

    await conn.query(`CREATE TABLE IF NOT EXISTS bookings (
      booking_id    INT AUTO_INCREMENT PRIMARY KEY,
      customer_id   INT NOT NULL,
      handled_by    INT NULL,
      event_type    VARCHAR(100) NOT NULL,
      event_date    DATE NOT NULL,
      venue_address VARCHAR(255) NOT NULL,
      guest_count   INT NOT NULL,
      status        ENUM('pending','confirmed','preparing','on_the_way','completed','cancelled') NOT NULL DEFAULT 'pending',
      total_amount  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_bookings_customer FOREIGN KEY (customer_id) REFERENCES users(user_id) ON DELETE CASCADE,
      CONSTRAINT fk_bookings_staff FOREIGN KEY (handled_by) REFERENCES users(user_id) ON DELETE SET NULL
    )`);

    await conn.query(`CREATE TABLE IF NOT EXISTS booking_items (
      item_id    INT AUTO_INCREMENT PRIMARY KEY,
      booking_id INT NOT NULL,
      service_id INT NOT NULL,
      quantity   INT NOT NULL DEFAULT 1,
      unit_price DECIMAL(10,2) NOT NULL,
      subtotal   DECIMAL(10,2) NOT NULL,
      CONSTRAINT fk_bi_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
      CONSTRAINT fk_bi_service FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE CASCADE
    )`);

    await conn.query(`CREATE TABLE IF NOT EXISTS payments (
      payment_id     INT AUTO_INCREMENT PRIMARY KEY,
      booking_id     INT NOT NULL,
      amount_paid    DECIMAL(10,2) NOT NULL,
      payment_method ENUM('cash','gcash','bank_transfer','card') NOT NULL DEFAULT 'cash',
      reference_no   VARCHAR(100),
      recorded_by    INT NOT NULL,
      payment_date   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
      CONSTRAINT fk_payments_user FOREIGN KEY (recorded_by) REFERENCES users(user_id) ON DELETE CASCADE
    )`);

    await conn.query(`CREATE TABLE IF NOT EXISTS notifications (
      notification_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id         INT NOT NULL,
      message         VARCHAR(255) NOT NULL,
      is_read         BOOLEAN DEFAULT FALSE,
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    )`);

    await conn.query(`CREATE TABLE IF NOT EXISTS audit_logs (
      log_id      INT AUTO_INCREMENT PRIMARY KEY,
      user_id     INT NOT NULL,
      action      VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id   INT NULL,
      details     TEXT NULL,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    // Add self-referencing FK on users.created_by (ignore if already exists)
    try {
      await conn.query(`ALTER TABLE users ADD CONSTRAINT fk_users_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL`);
    } catch (fkErr) {
      // Ignore — constraint already exists
    }

    const procDefs = [
      `CREATE PROCEDURE sp_get_services_by_category()
BEGIN
SELECT c.category_id, c.category_name, c.description AS category_description, s.service_id, s.service_name, s.description AS service_description, s.base_price, s.unit, s.image_url FROM service_categories c JOIN services s ON s.category_id = c.category_id WHERE c.is_active = TRUE AND s.is_active = TRUE ORDER BY c.category_id, s.service_name;
END`,

      `CREATE PROCEDURE sp_create_customer_account(
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
END`,

      `CREATE PROCEDURE sp_verify_customer_account(
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
END`,

      `CREATE PROCEDURE sp_create_booking(IN p_customer_id INT, IN p_event_type VARCHAR(100), IN p_event_date DATE, IN p_venue_address VARCHAR(255), IN p_guest_count INT)
BEGIN
INSERT INTO bookings (customer_id, event_type, event_date, venue_address, guest_count, status) VALUES (p_customer_id, p_event_type, p_event_date, p_venue_address, p_guest_count, 'pending');
SELECT LAST_INSERT_ID() AS new_booking_id;
END`,

      `CREATE PROCEDURE sp_add_booking_item(IN p_booking_id INT, IN p_service_id INT, IN p_quantity INT)
BEGIN
DECLARE v_price DECIMAL(10,2);
SELECT base_price INTO v_price FROM services WHERE service_id = p_service_id;
INSERT INTO booking_items (booking_id, service_id, quantity, unit_price, subtotal) VALUES (p_booking_id, p_service_id, p_quantity, v_price, v_price * p_quantity);
UPDATE bookings b SET total_amount = (SELECT COALESCE(SUM(subtotal), 0) FROM booking_items WHERE booking_id = p_booking_id) WHERE b.booking_id = p_booking_id;
END`,

      `CREATE PROCEDURE sp_update_booking_status(IN p_booking_id INT, IN p_status VARCHAR(20), IN p_staff_id INT)
BEGIN
UPDATE bookings SET status = p_status, handled_by = COALESCE(p_staff_id, handled_by) WHERE booking_id = p_booking_id;
END`,

      `CREATE PROCEDURE sp_record_payment(IN p_booking_id INT, IN p_amount_paid DECIMAL(10,2), IN p_payment_method VARCHAR(20), IN p_reference_no VARCHAR(100), IN p_recorded_by INT)
BEGIN
DECLARE v_total DECIMAL(10,2);
DECLARE v_paid DECIMAL(10,2);
INSERT INTO payments (booking_id, amount_paid, payment_method, reference_no, recorded_by) VALUES (p_booking_id, p_amount_paid, p_payment_method, p_reference_no, p_recorded_by);
SELECT total_amount INTO v_total FROM bookings WHERE booking_id = p_booking_id;
SELECT COALESCE(SUM(amount_paid), 0) INTO v_paid FROM payments WHERE booking_id = p_booking_id;
SELECT v_total AS total_amount, v_paid AS total_paid, (v_total - v_paid) AS balance;
END`,

      `CREATE PROCEDURE sp_admin_dashboard_summary()
BEGIN
SELECT (SELECT COUNT(*) FROM users WHERE role = 'customer' AND account_status = 'pending') AS pending_verifications, (SELECT COUNT(*) FROM bookings WHERE status = 'pending') AS pending_bookings, (SELECT COUNT(*) FROM bookings WHERE status = 'completed') AS completed_bookings, (SELECT COALESCE(SUM(amount_paid), 0) FROM payments) AS total_revenue;
END`
    ];

    let procConn;
    try {
      const [existingProcs] = await conn.query(
        "SELECT ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE'",
        [process.env.DB_NAME || 'cms']
      );
      const existingProcNames = (existingProcs || []).map(r => r.ROUTINE_NAME);
      const procNames = [
        'sp_get_services_by_category',
        'sp_create_customer_account',
        'sp_verify_customer_account',
        'sp_create_booking',
        'sp_add_booking_item',
        'sp_update_booking_status',
        'sp_record_payment',
        'sp_admin_dashboard_summary'
      ];
      const allCoreProcsExist = procNames.every(name => existingProcNames.includes(name));

      if (!allCoreProcsExist || process.env.FORCE_DB_SYNC === 'true') {
        procConn = await mysql.createConnection({
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '3306'),
          user: process.env.DB_USER || 'cms_db',
          password: process.env.DB_PASS !== undefined ? process.env.DB_PASS : 'cms_db',
          database: process.env.DB_NAME || 'cms',
          multipleStatements: false
        });

        for (const name of procNames) {
          await procConn.query(`DROP PROCEDURE IF EXISTS ${name}`);
        }

        for (const def of procDefs) {
          await procConn.query(def);
        }
      }
    } finally {
      if (procConn) await procConn.end().catch(() => {});
    }

    // Seed default categories if empty
    const [catCount] = await conn.query('SELECT COUNT(*) as cnt FROM service_categories');
    if (catCount[0].cnt === 0) {
      console.log('Seeding initial service categories and services...');
      await conn.query(`
        INSERT INTO service_categories (category_name, description) VALUES
        ('Event Catering (Special Occasions)', 'Full-service food preparation and serving for personal celebrations.'),
        ('Food Delivery & On-Site Setup', 'Reliable delivery of food to the venue with professional setup.'),
        ('Dessert & Beverage Packages', 'Add-on packages to complement the main meal.'),
        ('Equipment & Utensil Rental', 'Provision of necessary dining and serving equipment.');

        INSERT INTO services (category_id, service_name, description, base_price, unit, image_url) VALUES
        (1, 'Wedding Catering Package', 'Inclusions: Table: 8 VIP & guest tables | Person: 150 person | Chairs: 150 dressed chairs with ribbon | Design: Grand bridal backdrop, red carpet & stage styling | Foods: 5-course gourmet wedding buffet with waitstaff. (Additional person/food: ₱350/head)', 25000.00, 'package', 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80'),
        (1, 'Birthday Catering Package', 'Inclusions: Table: 5 tables | Person: 100 person | Chairs: 100 dressed chairs with ribbon | Design: Themed birthday backdrop & balloon styling | Foods: Complete celebration buffet meal with warmers & drinks. (Additional person/food: ₱250/head)', 12000.00, 'package', 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=600&q=80'),
        (1, 'Baptismal Catering Package', 'Inclusions: Table: 4 tables | Person: 80 person | Chairs: 80 dressed chairs with ribbon | Design: Dedicated baptismal & angelic motif setup | Foods: Full christening buffet spread with warmers & drinks. (Additional person/food: ₱250/head)', 10000.00, 'package', 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=600&q=80'),
        (1, 'Family Reunion Package', 'Inclusions: Table: 6 tables | Person: 120 person | Chairs: 120 dressed chairs with ribbon | Design: Reunion celebration banner & centerpiece setup | Foods: Heavy celebration banquet buffet with unlimited drinks. (Additional person/food: ₱250/head)', 15000.00, 'package', 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=600&q=80'),
        (1, 'Additional Food / Person (per head)', 'Inclusions: Food: Extra 1 full buffet portion including all main dishes & drinks | Seating: 1 additional dressed chair & table placement | Service: Full dinnerware, glassware & cutlery set included', 250.00, 'per head', 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=600&q=80'),
        (2, 'Buffet Station Setup', 'Inclusions: Table: 3 skirted buffet presentation tables | Warmers: 5 stainless roll-top chafing dishes | Utensils: Full dinnerware & serving cutlery set | Service: Professional on-site arrangement & food staging | Capacity: Good for up to 100 guests', 5000.00, 'package', 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=600&q=80'),
        (2, 'Chafing Dish Provision', 'Inclusions: Unit: 1 stainless roll-top chafing dish | Pans: 1 full-size food pan & 1 water pan | Warmers: 1 chafing fuel burner canister | Utensils: 1 food serving tong & ladle', 150.00, 'unit', 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80'),
        (2, 'Serving Crew (per head)', 'Inclusions: Staff: 1 professional uniformed waiter/server | Duration: Up to 5 hours on-site banquet service | Scope: Buffet line maintenance, table bussing & guest assistance | Ratio: Recommended 1 server per 25-30 guests', 800.00, 'per head', 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=600&q=80'),
        (3, 'Custom Cake', 'Inclusions: Cake: 2-Tier customized fondant or buttercream cake | Motif: Personalized event theme design & colors | Accessories: Customized cake topper, candles & presentation knife | Capacity: Serves 40-50 guests', 2500.00, 'unit', 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=600&q=80'),
        (3, 'Pastry Platter', 'Inclusions: Items: 40 pieces assorted sweet pastries & mini tarts | Selection: Cream puffs, brownies, eclairs & fruit tartlets | Packaging: Elegant banquet presentation platter with food covers | Capacity: Good for 20-30 guests', 1800.00, 'platter', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80'),
        (3, 'Drink Station (Juice/Coffee/Tea)', 'Inclusions: Beverages: 2 chilled juice flavors, brewed coffee & herbal tea | Equipment: 3 glass beverage dispensers & 1 thermal hot urn | Supplies: Paper cups, stirrers, ice chest, creamer & sweeteners | Capacity: Good for 100 guests', 3500.00, 'package', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80'),
        (3, 'Dessert Bar', 'Inclusions: Sweets: Assorted shooters, mini cupcakes, mousse cups & cookies | Setup: 1 skirted dessert table with tiered acrylic displays & decors | Utensils: Mini dessert spoons, tongs, napkins & themed signage | Capacity: Good for 80-100 guests', 4500.00, 'package', 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80'),
        (3, 'Whole Roast Lechon (Add-on Food)', 'Inclusions: Lechon: 1 whole authentic Cebu crispy golden roast pig | Weight: 18-20 kg live weight | Sauce: 2 bottles house-blend savory liver sauce | Capacity: Serves 40-50 guests', 8000.00, 'unit', 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80'),
        (3, 'Extra Main Dish Party Tray (Add-on Food)', 'Inclusions: Dish: 1 large banquet tray of specialty viand | Choices: Beef Caldereta, Pork Hamonado, or Buttered Chicken | Packaging: Heavy-duty aluminum thermal container with serving ladle | Capacity: Good for 25-30 guests', 1500.00, 'tray', 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=600&q=80'),
        (4, 'Table Rental', 'Inclusions: Table: 1 standard 8-10 seater round or rectangular banquet table | Structure: Heavy-duty foldable steel legs & solid top | Use: Ideal for guest dining, buffet extensions, or gift table', 100.00, 'unit', 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=600&q=80'),
        (4, 'Chair Rental', 'Inclusions: Chair: 1 heavy-duty monoblock banquet chair | Capacity: Rated up to 150 kg load | Use: Clean, stackable, durable event seating', 30.00, 'unit', 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80'),
        (4, 'Tablecloth Rental', 'Inclusions: Fabric: 1 floor-length premium polyester tablecloth | Motif: Colors matched to your event theme | Fit: Standard round or rectangular banquet table coverage', 50.00, 'unit', 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=600&q=80'),
        (4, 'Plates & Glasses Set', 'Inclusions: Dinnerware: 1 porcelain dinner plate & 1 dessert plate | Glassware: 1 highball water glass & 1 wine goblet | Hygiene: Sanitized, polished & wrapped per set', 20.00, 'set', 'https://images.unsplash.com/photo-1615865417236-d67f5ed658e6?auto=format&fit=crop&w=600&q=80'),
        (4, 'Cutlery Set', 'Inclusions: Flatware: 1 dinner spoon, 1 dinner fork, 1 butter knife & 1 dessert spoon | Material: Mirror-polished food-grade stainless steel | Packaging: Sanitized & sleeved per set', 15.00, 'set', 'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?auto=format&fit=crop&w=600&q=80'),
        (4, 'Serving Tray Rental', 'Inclusions: Tray: 1 heavy-duty non-slip banquet serving tray | Grip: Rubberized non-skid surface for safe beverage & food transport | Use: Ideal for food runners and banquet staff', 40.00, 'unit', 'https://images.unsplash.com/photo-1581349485608-9469926a8e5e?auto=format&fit=crop&w=600&q=80');
      `);
    }

    // Auto-update missing image_url values for existing services
    await conn.query(`
      UPDATE services SET image_url = CASE
        WHEN service_name LIKE '%Wedding%' THEN 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80'
        WHEN service_name LIKE '%Birthday%' THEN 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=600&q=80'
        WHEN service_name LIKE '%Baptismal%' THEN 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=600&q=80'
        WHEN service_name LIKE '%Family%' OR service_name LIKE '%Reunion%' THEN 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=600&q=80'
        WHEN service_name LIKE '%Buffet%' THEN 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=600&q=80'
        WHEN service_name LIKE '%Chafing%' THEN 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80'
        WHEN service_name LIKE '%Serving Crew%' OR service_name LIKE '%Crew%' THEN 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=600&q=80'
        WHEN service_name LIKE '%Cake%' THEN 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=600&q=80'
        WHEN service_name LIKE '%Pastry%' THEN 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80'
        WHEN service_name LIKE '%Drink%' OR service_name LIKE '%Juice%' THEN 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80'
        WHEN service_name LIKE '%Dessert%' THEN 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80'
        WHEN service_name LIKE '%Table%' AND service_name NOT LIKE '%Tablecloth%' THEN 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=600&q=80'
        WHEN service_name LIKE '%Chair%' THEN 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80'
        WHEN service_name LIKE '%Tablecloth%' THEN 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=600&q=80'
        WHEN service_name LIKE '%Plates%' OR service_name LIKE '%Glasses%' THEN 'https://images.unsplash.com/photo-1615865417236-d67f5ed658e6?auto=format&fit=crop&w=600&q=80'
        WHEN service_name LIKE '%Cutlery%' THEN 'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?auto=format&fit=crop&w=600&q=80'
        WHEN service_name LIKE '%Tray%' THEN 'https://images.unsplash.com/photo-1581349485608-9469926a8e5e?auto=format&fit=crop&w=600&q=80'
        ELSE 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=600&q=80'
      END
      WHERE image_url IS NULL OR image_url = '';
    `);

    // Migration: Update any existing @cms.com emails in users table to @gmail.com
    await conn.query(`
      UPDATE users SET email = REPLACE(email, '@cms.com', '@gmail.com') WHERE email LIKE '%@cms.com';
    `);

    // Seed default Admin and Staff accounts if none exist
    const [userCount] = await conn.query('SELECT COUNT(*) as cnt FROM users');
    if (userCount[0].cnt === 0) {
      console.log('Seeding default Admin and Staff users...');
      const adminPassHash = await bcrypt.hash('admin123', 10);
      const staffPassHash = await bcrypt.hash('staff123', 10);
      const customerPassHash = await bcrypt.hash('customer123', 10);

      await conn.query(`
        INSERT INTO users (firstname, lastname, gender, age, contact_number, email, password, role, account_status) VALUES
        ('System', 'Admin', 'Male', 35, '09170000000', 'admin@gmail.com', '${adminPassHash}', 'admin', 'active'),
        ('John', 'Staff', 'Male', 29, '09171111111', 'staff@gmail.com', '${staffPassHash}', 'staff', 'active'),
        ('Maria', 'Customer', 'Female', 27, '09172222222', 'customer@gmail.com', '${customerPassHash}', 'customer', 'verified');
      `);
    }

    console.log('Database initialization completed successfully.');
  } catch (error) {
    console.error('Error during database initialization:', error);
  } finally {
    if (conn) conn.release();
  }
}

module.exports = {
  pool,
  initDb
};
