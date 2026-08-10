const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const user = rows[0];

    // Check account status
    if (user.role === 'customer') {
      if (user.account_status === 'pending') {
        return res.status(403).json({ message: 'Account is pending verification by Admin.' });
      }
      if (user.account_status === 'rejected') {
        return res.status(403).json({ message: 'Account verification was rejected by Admin.' });
      }
      if (user.account_status === 'inactive') {
        return res.status(403).json({ message: 'Account is inactive.' });
      }
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const payload = {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      firstname: user.firstname,
      lastname: user.lastname
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'cms_jwt_secret_key_2026_super_secure',
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        user_id: user.user_id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        role: user.role,
        account_status: user.account_status
      }
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT user_id, customer_no, firstname, middlename, lastname, gender, age, contact_number, email, role, account_status, created_at FROM users WHERE user_id = ?',
      [req.user.user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
};

// Public self-registration for customers
const registerCustomer = async (req, res, next) => {
  try {
    const { firstname, middlename, lastname, gender, age, contact_number, email, customer_no } = req.body;

    // Validate required fields
    if (!firstname || !lastname || !gender || !age || !contact_number || !email) {
      return res.status(400).json({ message: 'All required fields must be filled in.' });
    }

    // Validate age range
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      return res.status(400).json({ message: 'Please enter a valid age.' });
    }

    // Validate gender
    if (!['Male', 'Female', 'Other'].includes(gender)) {
      return res.status(400).json({ message: 'Invalid gender value.' });
    }

    // Check for duplicate email
    const [existing] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'This email address is already registered.' });
    }

    // Use empty string placeholder for password — set by admin on approval
    const placeholderHash = await bcrypt.hash('PENDING_APPROVAL', 10);

    // Call the stored procedure (p_staff_id = NULL since self-registered)
    const [result] = await pool.query(
      'CALL sp_create_customer_account(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [firstname, lastname, middlename || null, gender, ageNum, contact_number, email, placeholderHash, null, customer_no || null]
    );

    const newUserId = result[0][0]?.new_user_id;
    const finalCustomerNo = result[0][0]?.customer_no || customer_no;

    res.status(201).json({
      message: 'Registration submitted successfully! Your account is pending admin approval. You will receive your login password once your account is verified.',
      user_id: newUserId,
      customer_no: finalCustomerNo
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  getMe,
  registerCustomer
};
