-- =========================================
-- USERS (Customer, Staff, Admin)
-- =========================================
CREATE TABLE IF NOT EXISTS users (
    user_id         INT AUTO_INCREMENT PRIMARY KEY,
    firstname       VARCHAR(50)  NOT NULL,
    lastname        VARCHAR(50)  NOT NULL,
    gender          ENUM('Male', 'Female', 'Other') NOT NULL,
    age             INT NOT NULL,
    contact_number  VARCHAR(20)  NOT NULL,
    email           VARCHAR(100) NOT NULL UNIQUE,
    password        VARCHAR(255) NOT NULL,
    role            ENUM('customer', 'staff', 'admin') NOT NULL DEFAULT 'customer',
    account_status  ENUM('pending', 'verified', 'rejected', 'active', 'inactive')
                    NOT NULL DEFAULT 'active',
    created_by      INT NULL,                    -- staff_id who created a customer account
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =========================================
-- VERIFICATION LOGS (Admin approves Staff-created customers)
-- =========================================
CREATE TABLE IF NOT EXISTS verification_logs (
    log_id        INT AUTO_INCREMENT PRIMARY KEY,
    user_id       INT NOT NULL,                  -- the customer account being verified
    reviewed_by   INT NOT NULL,                  -- admin user_id
    action        ENUM('approved', 'rejected') NOT NULL,
    remarks       VARCHAR(255) NULL,
    action_date   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vl_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_vl_admin FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE CASCADE
);

-- =========================================
-- SERVICE CATEGORIES
-- =========================================
CREATE TABLE IF NOT EXISTS service_categories (
    category_id     INT AUTO_INCREMENT PRIMARY KEY,
    category_name   VARCHAR(100) NOT NULL UNIQUE,
    description     VARCHAR(255),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- SERVICES (under each category)
-- =========================================
CREATE TABLE IF NOT EXISTS services (
    service_id      INT AUTO_INCREMENT PRIMARY KEY,
    category_id     INT NOT NULL,
    service_name    VARCHAR(150) NOT NULL,
    description     VARCHAR(500),
    base_price      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    unit            VARCHAR(30) DEFAULT 'package',   -- e.g., per head, per unit, per package
    image_url       VARCHAR(255),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_services_category FOREIGN KEY (category_id) REFERENCES service_categories(category_id) ON DELETE CASCADE
);

-- =========================================
-- BOOKINGS
-- =========================================
CREATE TABLE IF NOT EXISTS bookings (
    booking_id      INT AUTO_INCREMENT PRIMARY KEY,
    customer_id     INT NOT NULL,
    handled_by      INT NULL,                         -- staff_id assigned
    event_type      VARCHAR(100) NOT NULL,             -- Wedding, Birthday, Baptismal, etc.
    event_date      DATE NOT NULL,
    venue_address   VARCHAR(255) NOT NULL,
    guest_count     INT NOT NULL,
    status          ENUM('pending','confirmed','preparing','on_the_way','completed','cancelled')
                    NOT NULL DEFAULT 'pending',
    total_amount    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_bookings_customer FOREIGN KEY (customer_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_bookings_staff FOREIGN KEY (handled_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- =========================================
-- BOOKING ITEMS (services/equipment selected per booking)
-- =========================================
CREATE TABLE IF NOT EXISTS booking_items (
    item_id         INT AUTO_INCREMENT PRIMARY KEY,
    booking_id      INT NOT NULL,
    service_id      INT NOT NULL,
    quantity        INT NOT NULL DEFAULT 1,
    unit_price      DECIMAL(10,2) NOT NULL,
    subtotal        DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_bi_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
    CONSTRAINT fk_bi_service FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE CASCADE
);

-- =========================================
-- PAYMENTS
-- =========================================
CREATE TABLE IF NOT EXISTS payments (
    payment_id      INT AUTO_INCREMENT PRIMARY KEY,
    booking_id      INT NOT NULL,
    amount_paid     DECIMAL(10,2) NOT NULL,
    payment_method  ENUM('cash','gcash','bank_transfer','card') NOT NULL DEFAULT 'cash',
    reference_no    VARCHAR(100),
    recorded_by     INT NOT NULL,                    -- staff/admin user_id
    payment_date    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
    CONSTRAINT fk_payments_user FOREIGN KEY (recorded_by) REFERENCES users(user_id) ON DELETE CASCADE
);

-- =========================================
-- NOTIFICATIONS
-- =========================================
CREATE TABLE IF NOT EXISTS notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,                    -- recipient (e.g., admin or staff)
    message         VARCHAR(255) NOT NULL,
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
