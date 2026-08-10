const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

const updateProfile = async (req, res, next) => {
  try {
    const { firstname, middlename, lastname, gender, age, contact_number, password } = req.body;
    const userId = req.user.user_id;

    if (!firstname || !lastname || !gender || age === undefined || age === null || age === '' || !contact_number) {
      return res.status(400).json({ message: 'All required profile fields must be filled.' });
    }

    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      return res.status(400).json({ message: 'Please enter a valid age (1-120).' });
    }

    let query = 'UPDATE users SET firstname = ?, middlename = ?, lastname = ?, gender = ?, age = ?, contact_number = ?';
    let params = [firstname.trim(), middlename ? middlename.trim() : null, lastname.trim(), gender, ageNum, contact_number.trim()];

    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ', password = ?';
      params.push(hashedPassword);
    }

    query += ' WHERE user_id = ?';
    params.push(userId);

    await pool.query(query, params);
    res.json({ message: 'Profile updated successfully.' });
  } catch (error) {
    next(error);
  }
};

const getCustomerDashboard = async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    // Get bookings summary
    const [bookings] = await pool.query(
      'SELECT booking_id, event_type, event_date, venue_address, guest_count, status, total_amount, created_at FROM bookings WHERE customer_id = ? ORDER BY created_at DESC',
      [userId]
    );

    // Get total spent
    const [payments] = await pool.query(
      'SELECT COALESCE(SUM(p.amount_paid), 0) AS total_spent FROM payments p JOIN bookings b ON p.booking_id = b.booking_id WHERE b.customer_id = ?',
      [userId]
    );

    res.json({
      bookings,
      total_spent: payments[0].total_spent
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateProfile,
  getCustomerDashboard
};
