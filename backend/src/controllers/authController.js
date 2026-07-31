const bcrypt = require("bcryptjs");
const { pool } = require("../config/db");
const { signToken } = require("../utils/jwt");

// POST /api/auth/login
// Works for all 3 roles (admin, staff, customer).
// Customer accounts must have status = 'active' (i.e. approved by Admin).
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const [rows] = await pool.query("CALL sp_get_user_by_email(?)", [email]);
    const user = rows[0][0];

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (user.role === "customer" && user.status !== "active") {
      return res.status(403).json({
        message:
          user.status === "pending"
            ? "Your account is still awaiting Admin verification."
            : "Your account is not active. Please contact support.",
      });
    }

    const token = signToken({ id: user.id, role: user.role, email: user.email });

    delete user.password_hash;

    return res.json({ message: "Login successful.", token, user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error during login." });
  }
}

// GET /api/auth/me
async function me(req, res) {
  try {
    const [rows] = await pool.query("CALL sp_get_user_by_id(?)", [req.user.id]);
    const user = rows[0][0];
    if (!user) return res.status(404).json({ message: "User not found." });
    delete user.password_hash;
    return res.json({ user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error." });
  }
}

module.exports = { login, me };
