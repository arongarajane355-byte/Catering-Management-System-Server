const { pool } = require('../config/db');

// Record payment (Staff or Admin)
const recordPayment = async (req, res, next) => {
  try {
    const { booking_id, amount_paid, payment_method, reference_no } = req.body;
    const recordedBy = req.user.user_id;

    if (!booking_id || !amount_paid || parseFloat(amount_paid) <= 0 || !payment_method) {
      return res.status(400).json({ message: 'Booking ID, valid positive amount, and payment method are required.' });
    }

    const [result] = await pool.query(
      'CALL sp_record_payment(?, ?, ?, ?, ?)',
      [booking_id, parseFloat(amount_paid), payment_method, reference_no || '', recordedBy]
    );

    res.status(201).json({
      message: 'Payment recorded successfully.',
      ledger: result[0][0]
    });
  } catch (error) {
    next(error);
  }
};

// List all payments
const listPayments = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, b.event_type, b.event_date, u.firstname AS customer_firstname, u.lastname AS customer_lastname,
             rec.firstname AS recorded_by_firstname, rec.lastname AS recorded_by_lastname
      FROM payments p
      JOIN bookings b ON p.booking_id = b.booking_id
      JOIN users u ON b.customer_id = u.user_id
      JOIN users rec ON p.recorded_by = rec.user_id
      ORDER BY p.payment_date DESC
    `);
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  recordPayment,
  listPayments
};
