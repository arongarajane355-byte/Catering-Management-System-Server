const { pool } = require('../config/db');
const { updateProfile } = require('./authController');

const getCustomerDashboard = async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    // Get bookings summary with payments and calculated balance
    const [bookings] = await pool.query(
      `SELECT b.booking_id, b.event_type, b.event_date, b.venue_address, b.guest_count, b.status, b.total_amount, b.created_at,
              COALESCE(p_sub.total_paid, 0) AS total_paid,
              GREATEST(0, (b.total_amount - COALESCE(p_sub.total_paid, 0))) AS balance
       FROM bookings b
       LEFT JOIN (
         SELECT booking_id, SUM(amount_paid) AS total_paid
         FROM payments
         GROUP BY booking_id
       ) p_sub ON b.booking_id = p_sub.booking_id
       WHERE b.customer_id = ?
       ORDER BY b.created_at DESC`,
      [userId]
    );

    // Get total spent across all bookings
    const [payments] = await pool.query(
      'SELECT COALESCE(SUM(p.amount_paid), 0) AS total_spent FROM payments p JOIN bookings b ON p.booking_id = b.booking_id WHERE b.customer_id = ?',
      [userId]
    );

    // Calculate active unpaid balances (only for non-cancelled bookings)
    // For new customers (bookings.length === 0) or customers whose bookings are fully paid, canAvailServices is TRUE!
    const unpaidBookings = bookings.filter(b => b.status !== 'cancelled' && parseFloat(b.balance) > 0);
    const totalUnpaidBalance = unpaidBookings.reduce((sum, b) => sum + parseFloat(b.balance), 0);
    const canAvailServices = unpaidBookings.length === 0;

    res.json({
      bookings,
      total_spent: payments[0]?.total_spent || 0,
      has_unpaid_balance: !canAvailServices,
      total_unpaid_balance: totalUnpaidBalance,
      can_avail_services: canAvailServices,
      unpaid_bookings: unpaidBookings
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateProfile,
  getCustomerDashboard
};
