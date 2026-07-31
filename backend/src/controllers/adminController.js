const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

// Get all pending customer account verifications
const getPendingVerifications = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.user_id, u.firstname, u.lastname, u.gender, u.age, u.contact_number, u.email, u.account_status, u.created_at,
             s.firstname AS staff_firstname, s.lastname AS staff_lastname
      FROM users u
      LEFT JOIN users s ON u.created_by = s.user_id
      WHERE u.role = 'customer' AND u.account_status = 'pending'
      ORDER BY u.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

// Admin approves or rejects customer account
const verifyCustomerAccount = async (req, res, next) => {
  try {
    const { user_id, action, remarks } = req.body;
    const adminId = req.user.user_id;

    if (!user_id || !action || !['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ message: 'User ID and valid action (approved/rejected) are required.' });
    }

    await pool.query(
      'CALL sp_verify_customer_account(?, ?, ?, ?)',
      [user_id, adminId, action, remarks || '']
    );

    res.json({ message: `Customer account ${action} successfully.` });
  } catch (error) {
    next(error);
  }
};

// Admin Dashboard summary stats
const getAdminSummary = async (req, res, next) => {
  try {
    const [result] = await pool.query('CALL sp_admin_dashboard_summary()');
    const summary = result[0][0] || {};

    const [recentBookings] = await pool.query(`
      SELECT b.*, u.firstname, u.lastname
      FROM bookings b
      JOIN users u ON b.customer_id = u.user_id
      ORDER BY b.created_at DESC LIMIT 5
    `);

    res.json({
      summary,
      recentBookings
    });
  } catch (error) {
    next(error);
  }
};

// Manage Staff Accounts
const getAllStaff = async (req, res, next) => {
  try {
    const [staffList] = await pool.query(
      'SELECT user_id, firstname, lastname, gender, age, contact_number, email, role, account_status, created_at FROM users WHERE role = "staff" ORDER BY created_at DESC'
    );
    res.json(staffList);
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { firstname, lastname, gender, age, contact_number, email, password, role } = req.body;
    if (!firstname || !lastname || !gender || !age || !contact_number || !email || !password) {
      return res.status(400).json({ message: 'All user fields are required.' });
    }

    const userRole = ['staff', 'customer'].includes(role) ? role : 'staff';
    const status = userRole === 'customer' ? 'verified' : 'active';

    const [existing] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (firstname, lastname, gender, age, contact_number, email, password, role, account_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [firstname, lastname, gender, parseInt(age), contact_number, email, passwordHash, userRole, status]
    );

    res.status(201).json({ message: `${userRole === 'staff' ? 'Staff' : 'Customer'} account created successfully.` });
  } catch (error) {
    next(error);
  }
};

const createStaff = createUser;

const toggleUserStatus = async (req, res, next) => {
  try {
    const { user_id, account_status } = req.body;
    if (!user_id || !account_status) {
      return res.status(400).json({ message: 'User ID and status are required.' });
    }

    await pool.query('UPDATE users SET account_status = ? WHERE user_id = ?', [account_status, user_id]);
    res.json({ message: `User status updated to ${account_status}.` });
  } catch (error) {
    next(error);
  }
};

// Get all users (Staff and Customers)
const getAllUsers = async (req, res, next) => {
  try {
    const [userList] = await pool.query(
      'SELECT user_id, firstname, lastname, gender, age, contact_number, email, role, account_status, created_at FROM users WHERE role != "admin" ORDER BY created_at DESC'
    );
    res.json(userList);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPendingVerifications,
  verifyCustomerAccount,
  getAdminSummary,
  getAllStaff,
  getAllUsers,
  createStaff,
  createUser,
  toggleUserStatus
};
