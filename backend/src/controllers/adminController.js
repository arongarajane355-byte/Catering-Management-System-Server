const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

// Get all pending customer account verifications
const getPendingVerifications = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.user_id, u.customer_no, u.firstname, u.middlename, u.lastname,
             u.gender, u.age, u.contact_number, u.email, u.account_status, u.created_at,
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

// Helper: generate a secure random password
const generatePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const digits = '0123456789';
  // Format: Cms@XXXXXX (3 uppercase + 3 lowercase + @ + 6 digits)
  let pass = 'Cms@';
  for (let i = 0; i < 6; i++) {
    pass += digits[Math.floor(Math.random() * digits.length)];
  }
  // Append 2 random alphanumeric chars for extra entropy
  for (let i = 0; i < 2; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  return pass;
};

// Admin approves or rejects customer account
const verifyCustomerAccount = async (req, res, next) => {
  try {
    const { user_id, action, remarks } = req.body;
    const adminId = req.user.user_id;

    if (!user_id || !action || !['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ message: 'User ID and valid action (approved/rejected) are required.' });
    }

    let generatedPassword = null;
    let passwordHash = '';

    if (action === 'approved') {
      generatedPassword = generatePassword();
      passwordHash = await bcrypt.hash(generatedPassword, 10);
    }

    await pool.query(
      'CALL sp_verify_customer_account(?, ?, ?, ?, ?)',
      [user_id, adminId, action, remarks || '', passwordHash]
    );

    const response = { message: `Customer account ${action} successfully.` };
    if (action === 'approved' && generatedPassword) {
      response.generated_password = generatedPassword;
    }

    res.json(response);
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
      'SELECT user_id, firstname, middlename, lastname, gender, age, contact_number, email, role, account_status, created_at FROM users WHERE role = "staff" ORDER BY created_at DESC'
    );
    res.json(staffList);
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { firstname, middlename, lastname, gender, age, contact_number, email, password, role } = req.body;
    const userRole = ['staff', 'customer'].includes(role) ? role : 'staff';

    // Password is only required when manually creating staff accounts
    if (!firstname || !lastname || !gender || age === undefined || age === null || age === '' || !contact_number || !email || (userRole === 'staff' && (!password || password.trim() === ''))) {
      return res.status(400).json({ message: 'All required user fields must be filled.' });
    }
    const status = userRole === 'customer' ? 'verified' : 'active';

    const cleanContact = (contact_number || '').trim();
    if (!/^\d{11}$/.test(cleanContact)) {
      return res.status(400).json({ message: 'Contact number must be exactly 11 digits (e.g. 09123456789).' });
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail.endsWith('@gmail.com')) {
      return res.status(400).json({ message: 'User email address must use @gmail.com.' });
    }

    const [existing] = await pool.query('SELECT user_id FROM users WHERE email = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    if (userRole === 'customer') {
      // Use SP for customers so customer_no is auto-generated
      await pool.query(
        'CALL sp_create_customer_account(?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [firstname, lastname, middlename || null, gender, parseInt(age), cleanContact, cleanEmail, passwordHash, req.user.user_id]
      );
      // Staff-created customers skip pending — set directly to verified
      await pool.query('UPDATE users SET account_status = ? WHERE email = ?', ['verified', cleanEmail]);
    } else {
      await pool.query(
        'INSERT INTO users (firstname, middlename, lastname, gender, age, contact_number, email, password, role, account_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [firstname, middlename || null, lastname, gender, parseInt(age), cleanContact, cleanEmail, passwordHash, userRole, status]
      );
    }

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
      'SELECT user_id, customer_no, firstname, middlename, lastname, gender, age, contact_number, email, role, account_status, created_at FROM users WHERE role != "admin" ORDER BY created_at DESC'
    );
    res.json(userList);
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// REPORTS & ANALYTICS ENDPOINTS
// -------------------------------------------------------------

const getAdminReportsSummary = async (req, res, next) => {
  try {
    const [totBilled] = await pool.query('SELECT COALESCE(SUM(total_amount), 0) AS total_billed, COUNT(*) AS total_bookings FROM bookings');
    const [totCollected] = await pool.query('SELECT COALESCE(SUM(amount_paid), 0) AS total_collected FROM payments');
    const [statusBreakdown] = await pool.query('SELECT status, COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS total_amount FROM bookings GROUP BY status');
    const [methodBreakdown] = await pool.query('SELECT payment_method, COUNT(*) AS tx_count, COALESCE(SUM(amount_paid), 0) AS total_amount FROM payments GROUP BY payment_method');
    const [userCounts] = await pool.query('SELECT role, account_status, COUNT(*) AS count FROM users GROUP BY role, account_status');

    const total_billed = parseFloat(totBilled[0]?.total_billed || 0);
    const total_collected = parseFloat(totCollected[0]?.total_collected || 0);
    const outstanding_balance = Math.max(0, total_billed - total_collected);
    const total_bookings = parseInt(totBilled[0]?.total_bookings || 0);

    res.json({
      total_billed,
      total_collected,
      outstanding_balance,
      total_bookings,
      status_breakdown: statusBreakdown,
      payment_methods_breakdown: methodBreakdown,
      user_counts: userCounts
    });
  } catch (error) {
    next(error);
  }
};

const getAdminBookingsReport = async (req, res, next) => {
  try {
    const [bookings] = await pool.query(`
      SELECT 
        b.booking_id,
        b.customer_id,
        b.handled_by,
        b.event_type,
        b.event_date,
        b.venue_address,
        b.guest_count,
        b.status,
        b.total_amount,
        b.created_at,
        u.firstname AS customer_firstname,
        u.lastname AS customer_lastname,
        u.email AS customer_email,
        u.contact_number AS customer_phone,
        u.customer_no,
        s.firstname AS staff_firstname,
        s.lastname AS staff_lastname,
        s.email AS staff_email,
        COALESCE(p.paid_amount, 0) AS total_paid,
        (b.total_amount - COALESCE(p.paid_amount, 0)) AS balance,
        COALESCE(items_cnt.item_count, 0) AS total_items,
        COALESCE(items_cnt.items_summary, 'No items selected') AS items_summary
      FROM bookings b
      JOIN users u ON b.customer_id = u.user_id
      LEFT JOIN users s ON b.handled_by = s.user_id
      LEFT JOIN (
        SELECT booking_id, SUM(amount_paid) AS paid_amount
        FROM payments
        GROUP BY booking_id
      ) p ON b.booking_id = p.booking_id
      LEFT JOIN (
        SELECT 
          bi.booking_id, 
          COUNT(*) AS item_count,
          GROUP_CONCAT(CONCAT(srv.service_name, ' (x', bi.quantity, ')') SEPARATOR ', ') AS items_summary
        FROM booking_items bi
        JOIN services srv ON bi.service_id = srv.service_id
        GROUP BY bi.booking_id
      ) items_cnt ON b.booking_id = items_cnt.booking_id
      ORDER BY b.created_at DESC
    `);
    res.json(bookings);
  } catch (error) {
    next(error);
  }
};

const getAdminTransactionsReport = async (req, res, next) => {
  try {
    const [transactions] = await pool.query(`
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
        st.role AS staff_role,
        c.firstname AS customer_firstname,
        c.lastname AS customer_lastname,
        c.customer_no,
        b.event_type,
        b.status AS booking_status,
        b.total_amount AS booking_total
      FROM payments p
      LEFT JOIN users st ON p.recorded_by = st.user_id
      JOIN bookings b ON p.booking_id = b.booking_id
      JOIN users c ON b.customer_id = c.user_id
      ORDER BY p.payment_date DESC
    `);
    res.json(transactions);
  } catch (error) {
    next(error);
  }
};

const getAdminStaffPerformance = async (req, res, next) => {
  try {
    const [performance] = await pool.query(`
      SELECT 
        u.user_id AS staff_id,
        u.firstname,
        u.lastname,
        u.email,
        u.contact_number,
        u.account_status,
        COUNT(DISTINCT b.booking_id) AS total_handled_bookings,
        COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.booking_id END) AS completed_bookings,
        COUNT(DISTINCT p.payment_id) AS payments_processed,
        COALESCE(SUM(p.amount_paid), 0) AS total_money_collected
      FROM users u
      LEFT JOIN bookings b ON b.handled_by = u.user_id
      LEFT JOIN payments p ON p.recorded_by = u.user_id
      WHERE u.role IN ('staff', 'admin')
      GROUP BY u.user_id, u.firstname, u.lastname, u.email, u.contact_number, u.account_status
      ORDER BY total_money_collected DESC, total_handled_bookings DESC
    `);
    res.json(performance);
  } catch (error) {
    next(error);
  }
};

const getAdminStaffReportsDetail = async (req, res, next) => {
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

    const [staffLogs] = await pool.query(`
      SELECT 
        a.log_id,
        a.user_id,
        a.action,
        a.entity_type,
        a.entity_id,
        a.details,
        a.created_at,
        st.firstname AS staff_firstname,
        st.lastname AS staff_lastname,
        st.email AS staff_email
      FROM audit_logs a
      JOIN users st ON a.user_id = st.user_id
      WHERE st.role = 'staff'
      ORDER BY a.created_at DESC
      LIMIT 100
    `);

    const [staffBookings] = await pool.query(`
      SELECT 
        b.booking_id,
        b.customer_id,
        b.event_type,
        b.event_date,
        b.venue_address,
        b.guest_count,
        b.status,
        b.total_amount,
        b.created_at,
        b.handled_by,
        st.firstname AS staff_firstname,
        st.lastname AS staff_lastname,
        st.email AS staff_email,
        c.firstname AS customer_firstname,
        c.lastname AS customer_lastname,
        c.customer_no,
        c.contact_number AS customer_phone,
        COALESCE(p.paid_amount, 0) AS total_paid
      FROM bookings b
      JOIN users st ON b.handled_by = st.user_id
      JOIN users c ON b.customer_id = c.user_id
      LEFT JOIN (
        SELECT booking_id, SUM(amount_paid) AS paid_amount
        FROM payments
        GROUP BY booking_id
      ) p ON b.booking_id = p.booking_id
      WHERE st.role = 'staff'
      ORDER BY b.created_at DESC
    `);

    res.json({
      encodedCustomers,
      staffPayments,
      staffBookings,
      staffLogs
    });
  } catch (error) {
    next(error);
  }
};

const getAdminAuditLogs = async (req, res, next) => {
  try {
    const [logs] = await pool.query(`
      SELECT 
        a.log_id,
        a.user_id,
        a.action,
        a.entity_type,
        a.entity_id,
        a.details,
        a.created_at,
        u.firstname,
        u.lastname,
        u.email,
        u.role
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.user_id
      ORDER BY a.created_at DESC
      LIMIT 200
    `);
    res.json(logs);
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
  toggleUserStatus,
  getAdminReportsSummary,
  getAdminBookingsReport,
  getAdminTransactionsReport,
  getAdminStaffPerformance,
  getAdminStaffReportsDetail,
  getAdminAuditLogs
};
