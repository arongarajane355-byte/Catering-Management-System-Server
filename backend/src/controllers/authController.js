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
      'SELECT user_id, firstname, lastname, gender, age, contact_number, email, role, account_status, created_at FROM users WHERE user_id = ?',
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

module.exports = {
  login,
  getMe
};
