# Catering Management System — Database Design

Database engine: **MySQL 8+**
Database name: `cms` (matches `DB_NAME` in `backend/.env`)

```
DB_HOST=localhost
DB_USER=cms_db
DB_PASS=cms_db
DB_NAME=cms
```

## 1. Entity Overview

| Table | Purpose |
|---|---|
| `users` | Stores Admin, Staff, and Customer accounts (single table, differentiated by `role`). |
| `account_verifications` | Audit trail of Staff-created customer accounts and the Admin decision (approve/reject). |
| `service_categories` | The 4 service categories shown on the landing page. |
| `services` | Individual services/packages under each category. |
| `bookings` | A customer's booking request. Drives the **Input → Process → Output** workflow via the `stage` column. |
| `booking_items` | Line items (which services + quantity) attached to a booking. |
| `booking_status_history` | Audit trail of every stage transition on a booking. |

### The "Input → Process → Output" workflow

`bookings.stage` moves through:

1. **`input`** — Customer submits the booking request (event details + chosen services).
2. **`processing`** — Staff reviews/confirms it, resources are prepared.
3. **`completed`** (Output) — Admin/Staff marks the event as served/delivered. (`cancelled` is a possible exit state at any point.)

Every transition is logged in `booking_status_history`.

---

## 2. Schema — `CREATE TABLE` statements

```sql
CREATE DATABASE IF NOT EXISTS cms;
USE cms;

-- ---------------------------------------------------------------------
-- USERS (Admin / Staff / Customer)
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  role              ENUM('admin', 'staff', 'customer') NOT NULL,
  firstname         VARCHAR(100) NOT NULL,
  lastname          VARCHAR(100) NOT NULL,
  gender            ENUM('male', 'female', 'other') NOT NULL,
  age               TINYINT UNSIGNED NOT NULL,
  contact_number    VARCHAR(20) NOT NULL,
  email             VARCHAR(150) NOT NULL UNIQUE,
  password_hash     VARCHAR(255) NOT NULL,
  status            ENUM('pending', 'active', 'rejected', 'suspended') NOT NULL DEFAULT 'active',
  created_by        INT NULL COMMENT 'Staff user id who created this account (customers only)',
  verified_by       INT NULL COMMENT 'Admin user id who approved/rejected this account',
  verified_at       DATETIME NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_created_by  FOREIGN KEY (created_by)  REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_users_verified_by FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------
-- ACCOUNT VERIFICATIONS (audit trail: Staff creates -> Admin verifies)
-- ---------------------------------------------------------------------
CREATE TABLE account_verifications (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  user_id           INT NOT NULL COMMENT 'The customer account being verified',
  created_by_staff  INT NOT NULL,
  status            ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  reviewed_by_admin INT NULL,
  remarks           VARCHAR(255) NULL,
  reviewed_at       DATETIME NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_av_user    FOREIGN KEY (user_id)           REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_av_staff   FOREIGN KEY (created_by_staff)   REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_av_admin   FOREIGN KEY (reviewed_by_admin)  REFERENCES users(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------
-- SERVICE CATEGORIES (the 4 categories shown on the landing page)
-- ---------------------------------------------------------------------
CREATE TABLE service_categories (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(150) NOT NULL UNIQUE,
  description   VARCHAR(500) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- SERVICES (individual offerings/packages under a category)
-- ---------------------------------------------------------------------
CREATE TABLE services (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  category_id   INT NOT NULL,
  name          VARCHAR(150) NOT NULL,
  description   VARCHAR(500) NULL,
  price         DECIMAL(10,2) NOT NULL,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_services_category FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- BOOKINGS (Input -> Process -> Output)
-- ---------------------------------------------------------------------
CREATE TABLE bookings (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  customer_id   INT NOT NULL,
  event_type    VARCHAR(150) NOT NULL COMMENT 'e.g. Wedding, Birthday, Baptismal, Anniversary, Reunion',
  event_date    DATE NOT NULL,
  venue         VARCHAR(255) NOT NULL,
  guest_count   INT NULL,
  notes         VARCHAR(500) NULL,
  stage         ENUM('input', 'processing', 'completed', 'cancelled') NOT NULL DEFAULT 'input',
  total_amount  DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bookings_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- BOOKING ITEMS (which services were requested + quantity)
-- ---------------------------------------------------------------------
CREATE TABLE booking_items (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  booking_id    INT NOT NULL,
  service_id    INT NOT NULL,
  quantity      INT NOT NULL DEFAULT 1,
  unit_price    DECIMAL(10,2) NOT NULL,
  subtotal      DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  CONSTRAINT fk_bi_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_bi_service FOREIGN KEY (service_id) REFERENCES services(id)
);

-- ---------------------------------------------------------------------
-- BOOKING STATUS HISTORY (audit trail of stage transitions)
-- ---------------------------------------------------------------------
CREATE TABLE booking_status_history (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  booking_id    INT NOT NULL,
  stage         ENUM('input', 'processing', 'completed', 'cancelled') NOT NULL,
  changed_by    INT NOT NULL COMMENT 'user id (customer on input, staff/admin afterwards)',
  notes         VARCHAR(500) NULL,
  changed_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bsh_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_bsh_user    FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- ---------------------------------------------------------------------
-- Seed: service categories + example services
-- ---------------------------------------------------------------------
INSERT INTO service_categories (name, description) VALUES
('Event Catering (Special Occasions)', 'Full-service food preparation and serving for personal celebrations such as Weddings (Kasal), Birthdays, Baptismal, Anniversaries, and Family Reunions.'),
('Food Delivery & On-Site Setup', 'Reliable delivery of food to the venue with professional setup: buffet station setup, chafing dish provision, and optional serving staff/crew.'),
('Dessert & Beverage Packages', 'Add-on packages to complement the main meal: custom cakes, pastry platters, drink stations, and dessert bars.'),
('Equipment & Utensil Rental', 'Provision of necessary dining and serving equipment: tables, chairs, tablecloths, plates, glasses, cutlery, and serving trays.');

INSERT INTO services (category_id, name, description, price) VALUES
(1, 'Wedding Catering Package', 'Full-course meal service for wedding receptions.', 45000.00),
(1, 'Birthday Catering Package', 'Buffet-style catering for birthday celebrations.', 15000.00),
(1, 'Baptismal Catering Package', 'Traditional Filipino spread for baptismal celebrations.', 12000.00),
(2, 'Buffet Station Setup', 'Professional buffet station with chafing dishes.', 8000.00),
(2, 'Serving Crew (per staff)', 'Additional trained serving staff for the event.', 800.00),
(3, 'Custom Cake', 'Personalized cake design and flavor.', 2500.00),
(3, 'Coffee & Tea Station', 'Self-serve hot beverage station.', 3000.00),
(4, 'Tables & Chairs Rental (set of 10)', 'Includes 10 tables and 100 chairs.', 5000.00),
(4, 'Full Dinnerware Set Rental (per 50 pax)', 'Plates, glasses, cutlery, serving trays.', 4000.00);
```

---

## 3. Stored Procedures

```sql
DELIMITER $$

-- ==============================================================
-- AUTH
-- ==============================================================
CREATE PROCEDURE sp_get_user_by_email(IN p_email VARCHAR(150))
BEGIN
  SELECT * FROM users WHERE email = p_email LIMIT 1;
END$$

CREATE PROCEDURE sp_get_user_by_id(IN p_id INT)
BEGIN
  SELECT * FROM users WHERE id = p_id LIMIT 1;
END$$

-- ==============================================================
-- USER MANAGEMENT (Staff creates Customer -> Admin verifies)
-- ==============================================================
CREATE PROCEDURE sp_create_customer_account(
  IN p_firstname       VARCHAR(100),
  IN p_lastname        VARCHAR(100),
  IN p_gender          ENUM('male','female','other'),
  IN p_age             TINYINT UNSIGNED,
  IN p_contact_number  VARCHAR(20),
  IN p_email           VARCHAR(150),
  IN p_password_hash   VARCHAR(255),
  IN p_staff_id        INT,
  OUT p_new_user_id    INT
)
BEGIN
  INSERT INTO users (role, firstname, lastname, gender, age, contact_number, email, password_hash, status, created_by)
  VALUES ('customer', p_firstname, p_lastname, p_gender, p_age, p_contact_number, p_email, p_password_hash, 'pending', p_staff_id);

  SET p_new_user_id = LAST_INSERT_ID();

  INSERT INTO account_verifications (user_id, created_by_staff, status)
  VALUES (p_new_user_id, p_staff_id, 'pending');
END$$

CREATE PROCEDURE sp_create_staff_account(
  IN p_firstname       VARCHAR(100),
  IN p_lastname        VARCHAR(100),
  IN p_gender          ENUM('male','female','other'),
  IN p_age             TINYINT UNSIGNED,
  IN p_contact_number  VARCHAR(20),
  IN p_email           VARCHAR(150),
  IN p_password_hash   VARCHAR(255),
  IN p_admin_id        INT
)
BEGIN
  INSERT INTO users (role, firstname, lastname, gender, age, contact_number, email, password_hash, status, created_by)
  VALUES ('staff', p_firstname, p_lastname, p_gender, p_age, p_contact_number, p_email, p_password_hash, 'active', p_admin_id);
END$$

CREATE PROCEDURE sp_get_pending_verifications()
BEGIN
  SELECT u.id, u.firstname, u.lastname, u.gender, u.age, u.contact_number, u.email,
         u.status, u.created_at,
         CONCAT(s.firstname, ' ', s.lastname) AS created_by_name
  FROM users u
  LEFT JOIN users s ON s.id = u.created_by
  WHERE u.role = 'customer' AND u.status = 'pending'
  ORDER BY u.created_at ASC;
END$$

CREATE PROCEDURE sp_verify_customer_account(
  IN p_user_id    INT,
  IN p_status     ENUM('active','rejected'),
  IN p_admin_id   INT,
  IN p_remarks    VARCHAR(255)
)
BEGIN
  UPDATE users
  SET status = p_status, verified_by = p_admin_id, verified_at = NOW()
  WHERE id = p_user_id;

  UPDATE account_verifications
  SET status = IF(p_status = 'active', 'approved', 'rejected'),
      reviewed_by_admin = p_admin_id,
      remarks = p_remarks,
      reviewed_at = NOW()
  WHERE user_id = p_user_id
  ORDER BY id DESC
  LIMIT 1;
END$$

CREATE PROCEDURE sp_list_customers()
BEGIN
  SELECT id, firstname, lastname, gender, age, contact_number, email, status, created_at
  FROM users
  WHERE role = 'customer'
  ORDER BY created_at DESC;
END$$

-- ==============================================================
-- SERVICES / CATEGORIES (landing page)
-- ==============================================================
CREATE PROCEDURE sp_get_services_by_category()
BEGIN
  SELECT
    c.id   AS category_id,
    c.name AS category_name,
    c.description AS category_description,
    s.id   AS service_id,
    s.name AS service_name,
    s.description AS service_description,
    s.price
  FROM service_categories c
  LEFT JOIN services s ON s.category_id = c.id AND s.is_active = 1
  ORDER BY c.id, s.id;
END$$

CREATE PROCEDURE sp_create_service(
  IN p_category_id  INT,
  IN p_name         VARCHAR(150),
  IN p_description  VARCHAR(500),
  IN p_price        DECIMAL(10,2)
)
BEGIN
  INSERT INTO services (category_id, name, description, price)
  VALUES (p_category_id, p_name, p_description, p_price);
END$$

-- ==============================================================
-- BOOKINGS (Input -> Process -> Output)
-- ==============================================================
CREATE PROCEDURE sp_create_booking(
  IN p_customer_id   INT,
  IN p_event_type    VARCHAR(150),
  IN p_event_date    DATE,
  IN p_venue         VARCHAR(255),
  IN p_guest_count   INT,
  IN p_notes         VARCHAR(500),
  OUT p_new_booking_id INT
)
BEGIN
  INSERT INTO bookings (customer_id, event_type, event_date, venue, guest_count, notes, stage)
  VALUES (p_customer_id, p_event_type, p_event_date, p_venue, p_guest_count, p_notes, 'input');

  SET p_new_booking_id = LAST_INSERT_ID();

  INSERT INTO booking_status_history (booking_id, stage, changed_by, notes)
  VALUES (p_new_booking_id, 'input', p_customer_id, 'Booking submitted by customer.');
END$$

CREATE PROCEDURE sp_add_booking_item(
  IN p_booking_id  INT,
  IN p_service_id  INT,
  IN p_quantity    INT
)
BEGIN
  DECLARE v_price DECIMAL(10,2);
  SELECT price INTO v_price FROM services WHERE id = p_service_id;

  INSERT INTO booking_items (booking_id, service_id, quantity, unit_price)
  VALUES (p_booking_id, p_service_id, p_quantity, v_price);

  UPDATE bookings
  SET total_amount = (
    SELECT COALESCE(SUM(subtotal), 0) FROM booking_items WHERE booking_id = p_booking_id
  )
  WHERE id = p_booking_id;
END$$

CREATE PROCEDURE sp_get_bookings_by_customer(IN p_customer_id INT)
BEGIN
  SELECT * FROM bookings WHERE customer_id = p_customer_id ORDER BY created_at DESC;
END$$

CREATE PROCEDURE sp_get_all_bookings(IN p_stage VARCHAR(20))
BEGIN
  SELECT b.*, CONCAT(u.firstname, ' ', u.lastname) AS customer_name
  FROM bookings b
  JOIN users u ON u.id = b.customer_id
  WHERE p_stage IS NULL OR b.stage = p_stage
  ORDER BY b.created_at DESC;
END$$

CREATE PROCEDURE sp_get_booking_details(IN p_booking_id INT)
BEGIN
  -- Result set 1: booking header
  SELECT b.*, CONCAT(u.firstname, ' ', u.lastname) AS customer_name, u.email AS customer_email
  FROM bookings b
  JOIN users u ON u.id = b.customer_id
  WHERE b.id = p_booking_id;

  -- Result set 2: booking items
  SELECT bi.*, s.name AS service_name, s.category_id
  FROM booking_items bi
  JOIN services s ON s.id = bi.service_id
  WHERE bi.booking_id = p_booking_id;

  -- Result set 3: status history (audit trail)
  SELECT h.*, CONCAT(u.firstname, ' ', u.lastname) AS changed_by_name
  FROM booking_status_history h
  JOIN users u ON u.id = h.changed_by
  WHERE h.booking_id = p_booking_id
  ORDER BY h.changed_at ASC;
END$$

CREATE PROCEDURE sp_update_booking_stage(
  IN p_booking_id  INT,
  IN p_stage       ENUM('processing','completed','cancelled'),
  IN p_changed_by  INT,
  IN p_notes       VARCHAR(500)
)
BEGIN
  UPDATE bookings SET stage = p_stage WHERE id = p_booking_id;

  INSERT INTO booking_status_history (booking_id, stage, changed_by, notes)
  VALUES (p_booking_id, p_stage, p_changed_by, p_notes);
END$$

DELIMITER ;
```

---

## 4. How the app maps to these procedures

| API Endpoint | Stored Procedure |
|---|---|
| `POST /api/auth/login` | `sp_get_user_by_email` |
| `GET /api/auth/me` | `sp_get_user_by_id` |
| `POST /api/users/customers` (Staff) | `sp_create_customer_account` |
| `GET /api/users/customers/pending` (Admin) | `sp_get_pending_verifications` |
| `PATCH /api/users/customers/:id/verify` (Admin) | `sp_verify_customer_account` |
| `GET /api/users/customers` | `sp_list_customers` |
| `POST /api/users/staff` (Admin) | `sp_create_staff_account` |
| `GET /api/services/categories` (public, landing page) | `sp_get_services_by_category` |
| `POST /api/services` (Admin) | `sp_create_service` |
| `POST /api/bookings` (Customer — **Input**) | `sp_create_booking`, `sp_add_booking_item` |
| `GET /api/bookings/mine` | `sp_get_bookings_by_customer` |
| `GET /api/bookings` (Staff/Admin) | `sp_get_all_bookings` |
| `GET /api/bookings/:id` | `sp_get_booking_details` |
| `PATCH /api/bookings/:id/stage` (Staff — **Process**, Admin — **Output**) | `sp_update_booking_stage` |

## 5. First Admin account

There is no public admin registration (by design — Admin is the top of the role chain). After running the schema, create the first Admin manually, e.g.:

```sql
-- Generate a bcrypt hash for your password first (e.g. via Node: bcrypt.hashSync('yourpassword', 10))
INSERT INTO users (role, firstname, lastname, gender, age, contact_number, email, password_hash, status)
VALUES ('admin', 'System', 'Admin', 'other', 30, '0000000000', 'admin@cms.local', '<bcrypt_hash_here>', 'active');
```
