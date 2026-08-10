const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

const createCustomerAccount = async (req, res, next) => {
  try {
    const { firstname, middlename, lastname, gender, age, contact_number, email, customer_no, password } = req.body;
    const staffId = req.user.user_id;

    if (!firstname || !lastname || !gender || age === undefined || age === null || age === '' || !contact_number || !email) {
      return res.status(400).json({ message: 'All required customer fields must be filled.' });
    }

    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      return res.status(400).json({ message: 'Please enter a valid age (1-120).' });
    }

    // Check if email exists
    const [existing] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'A user with this email already exists.' });
    }

    const passToHash = (password && password.trim() !== '') ? password : 'PENDING_APPROVAL';
    const passwordHash = await bcrypt.hash(passToHash, 10);

    const [result] = await pool.query(
      'CALL sp_create_customer_account(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [firstname, lastname, middlename || null, gender, parseInt(age), contact_number, email, passwordHash, staffId, customer_no || null]
    );

    const newUserId = result[0][0]?.new_user_id;
    const finalCustomerNo = result[0][0]?.customer_no || customer_no;

    res.status(201).json({
      message: 'Customer account created successfully and routed to Admin for verification.',
      new_user_id: newUserId,
      customer_no: finalCustomerNo
    });
  } catch (error) {
    next(error);
  }
};

// Get accounts created by staff
const getCreatedCustomers = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.user_id, u.customer_no, u.firstname, u.middlename, u.lastname, u.gender, u.age, u.contact_number, u.email, u.account_status, u.created_at,
             vl.action, vl.remarks, vl.action_date
      FROM users u
      LEFT JOIN verification_logs vl ON u.user_id = vl.user_id
      WHERE u.role = 'customer' AND u.created_by IS NOT NULL
      ORDER BY u.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

// Get staff dashboard overview
const getStaffDashboard = async (req, res, next) => {
  try {
    const staffId = req.user.user_id;

    const [pendingAccounts] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE role = "customer" AND account_status = "pending"'
    );

    const [assignedBookings] = await pool.query(
      'SELECT COUNT(*) as count FROM bookings WHERE handled_by = ? OR handled_by IS NULL',
      [staffId]
    );

    const [upcomingEvents] = await pool.query(
      'SELECT b.*, u.firstname, u.lastname, u.contact_number FROM bookings b JOIN users u ON b.customer_id = u.user_id WHERE b.status NOT IN ("completed", "cancelled") ORDER BY b.event_date ASC LIMIT 10'
    );

    res.json({
      pending_accounts: pendingAccounts[0].count,
      assigned_bookings: assignedBookings[0].count,
      upcoming_events: upcomingEvents
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCustomerAccount,
  getCreatedCustomers,
  getStaffDashboard
};
