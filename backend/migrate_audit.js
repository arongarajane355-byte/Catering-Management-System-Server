const { pool } = require('c:/Users/Antonio Jr/Documents/GitHub/Catering-Management-System-Server/backend/src/config/db');

async function migrate() {
  try {
    await pool.query(`DROP TABLE IF EXISTS audit_logs`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        log_id      INT AUTO_INCREMENT PRIMARY KEY,
        user_id     INT NOT NULL,
        action      VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id   INT NULL,
        details     TEXT NULL,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('audit_logs table created with utf8mb4 successfully!');

    await pool.query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
      VALUES 
      (2, 'CUSTOMER_ENCODED', 'user', 4, 'Staff John encoded new customer account: Kevin Esto (CUST-2026-0004)'),
      (2, 'CUSTOMER_ENCODED', 'user', 5, 'Staff John encoded new customer account: Ara Arong (CUST-2026-0005)'),
      (2, 'CUSTOMER_ENCODED', 'user', 6, 'Staff John encoded new customer account: James Ronolo (CUST-2026-0006)'),
      (2, 'CUSTOMER_ENCODED', 'user', 10, 'Staff John encoded new customer account: Man Bomber (CUST-2026-0010)'),
      (2, 'BOOKING_ASSIGNED', 'booking', 2, 'Staff John accepted and assigned to Booking #BK-2 (pending)'),
      (2, 'BOOKING_STATUS_UPDATE', 'booking', 3, 'Staff John updated Booking #BK-3 status to confirmed'),
      (2, 'BOOKING_STATUS_UPDATE', 'booking', 5, 'Staff John updated Booking #BK-5 status to confirmed'),
      (2, 'BOOKING_STATUS_UPDATE', 'booking', 8, 'Staff John updated Booking #BK-8 status to confirmed'),
      (2, 'PAYMENT_RECORDED', 'payment', 1, 'Staff John recorded payment of PHP 4,000.00 for Booking #BK-3'),
      (2, 'PAYMENT_RECORDED', 'payment', 6, 'Staff John recorded payment of PHP 10,000.00 for Booking #BK-5')
    `);
    console.log('Seeded sample audit logs successfully!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    process.exit();
  }
}

migrate();
