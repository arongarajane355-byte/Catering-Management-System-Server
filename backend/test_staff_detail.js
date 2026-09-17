const { pool } = require('c:/Users/Antonio Jr/Documents/GitHub/Catering-Management-System-Server/backend/src/config/db');

async function test() {
  try {
    const [encodedCustomers] = await pool.query(`
      SELECT 
        c.user_id,
        c.customer_no,
        c.firstname AS customer_firstname,
        c.lastname AS customer_lastname,
        c.email AS customer_email,
        c.contact_number AS customer_phone,
        c.account_status,
        c.created_at,
        c.created_by,
        st.firstname AS staff_firstname,
        st.lastname AS staff_lastname,
        st.email AS staff_email
      FROM users c
      JOIN users st ON c.created_by = st.user_id
      WHERE c.role = 'customer'
      ORDER BY c.created_at DESC
    `);

    const [staffPayments] = await pool.query(`
      SELECT 
        p.payment_id,
        p.booking_id,
        p.amount_paid,
        p.payment_method,
        p.reference_no,
        p.payment_date,
        p.recorded_by,
        st.firstname AS staff_firstname,
        st.lastname AS staff_lastname,
        st.email AS staff_email,
        c.firstname AS customer_firstname,
        c.lastname AS customer_lastname,
        c.customer_no,
        b.event_type
      FROM payments p
      JOIN users st ON p.recorded_by = st.user_id
      JOIN bookings b ON p.booking_id = b.booking_id
      JOIN users c ON b.customer_id = c.user_id
      WHERE st.role = 'staff'
      ORDER BY p.payment_date DESC
    `);

    console.log('encodedCustomers count:', encodedCustomers.length);
    console.log('staffPayments count:', staffPayments.length);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit();
  }
}

test();
