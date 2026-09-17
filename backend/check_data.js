const { pool } = require('c:/Users/Antonio Jr/Documents/GitHub/Catering-Management-System-Server/backend/src/config/db');

async function test() {
  try {
    const [users] = await pool.query(`SELECT user_id, role, firstname, lastname, created_by FROM users`);
    console.log('USERS:', users);

    const [payments] = await pool.query(`SELECT payment_id, amount_paid, recorded_by FROM payments`);
    console.log('PAYMENTS:', payments);

    const [bookings] = await pool.query(`SELECT booking_id, customer_id, handled_by, status FROM bookings`);
    console.log('BOOKINGS:', bookings);
  } catch (err) {
    console.error('SQL Error:', err);
  } finally {
    process.exit();
  }
}

test();
