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
        customer_no: user.customer_no,
        firstname: user.firstname,
        middlename: user.middlename,
        lastname: user.lastname,
        gender: user.gender,
        age: user.age,
        contact_number: user.contact_number,
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

    // Validate contact number (standard 11-digit numeric)
    const cleanContact = (contact_number || '').trim();
    if (!/^\d{11}$/.test(cleanContact)) {
      return res.status(400).json({ message: 'Contact number must be exactly 11 digits (e.g. 09123456789).' });
    }

    // Validate gender
    if (!['Male', 'Female', 'Other'].includes(gender)) {
      return res.status(400).json({ message: 'Invalid gender value.' });
    }

    // Validate email domain
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail.endsWith('@gmail.com')) {
      return res.status(400).json({ message: 'Email address must use @gmail.com (e.g. user@gmail.com).' });
    }

    // Check for duplicate email
    const [existing] = await pool.query('SELECT user_id FROM users WHERE email = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'This email address is already registered.' });
    }

    // Use empty string placeholder for password — set by admin on approval
    const placeholderHash = await bcrypt.hash('PENDING_APPROVAL', 10);

    // Call the stored procedure (p_staff_id = NULL since self-registered)
    const [result] = await pool.query(
      'CALL sp_create_customer_account(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [firstname, lastname, middlename || null, gender, ageNum, cleanContact, cleanEmail, placeholderHash, null, customer_no || null]
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

// Universal Profile Update & Change Password handler (Customer, Staff, Admin)
const updateProfile = async (req, res, next) => {
  try {
    const {
      firstname, middlename, lastname, gender, age, contact_number, email,
      current_password, new_password, confirm_password
    } = req.body;
    const userId = req.user.user_id;

    if (!firstname || !lastname || !gender || age === undefined || age === null || age === '' || !contact_number || !email) {
      return res.status(400).json({ message: 'All required profile fields must be filled.' });
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail.endsWith('@gmail.com')) {
      return res.status(400).json({ message: 'Email address must use @gmail.com.' });
    }

    // Check duplicate email if changed
    const [emailCheck] = await pool.query('SELECT user_id FROM users WHERE email = ? AND user_id != ?', [cleanEmail, userId]);
    if (emailCheck.length > 0) {
      return res.status(400).json({ message: 'This email address is already in use by another account.' });
    }

    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      return res.status(400).json({ message: 'Please enter a valid age (1-120).' });
    }

    const cleanContact = (contact_number || '').trim();
    if (!/^\d{11}$/.test(cleanContact)) {
      return res.status(400).json({ message: 'Contact number must be exactly 11 digits (e.g. 09123456789).' });
    }

    // Fetch existing user password hash
    const [userRows] = await pool.query('SELECT password FROM users WHERE user_id = ?', [userId]);
    if (userRows.length === 0) {
      return res.status(404).json({ message: 'User account not found.' });
    }
    const storedHash = userRows[0].password;

    let updatedPasswordHash = null;
    const isAttemptingPasswordChange = (current_password && current_password.trim()) ||
                                      (new_password && new_password.trim()) ||
                                      (confirm_password && confirm_password.trim());

    if (isAttemptingPasswordChange) {
      if (!current_password || !new_password || !confirm_password) {
        return res.status(400).json({
          message: 'To change your password, you must enter Current Password, New Password, and Confirm New Password.'
        });
      }

      if (new_password !== confirm_password) {
        return res.status(400).json({ message: 'New password and confirmed change password do not match.' });
      }

      if (new_password.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
      }

      const isCurrentValid = await bcrypt.compare(current_password, storedHash);
      if (!isCurrentValid) {
        return res.status(400).json({ message: 'Current password entered is incorrect.' });
      }

      updatedPasswordHash = await bcrypt.hash(new_password, 10);
    }

    let query = 'UPDATE users SET firstname = ?, middlename = ?, lastname = ?, gender = ?, age = ?, contact_number = ?, email = ?';
    let params = [firstname.trim(), middlename ? middlename.trim() : null, lastname.trim(), gender, ageNum, cleanContact, cleanEmail];

    if (updatedPasswordHash) {
      query += ', password = ?';
      params.push(updatedPasswordHash);
    }

    query += ' WHERE user_id = ?';
    params.push(userId);

    await pool.query(query, params);

    res.json({ message: 'Profile information and settings updated successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  getMe,
  registerCustomer,
  updateProfile
};

