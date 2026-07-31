const bcrypt = require("bcryptjs");
const { pool } = require("../config/db");

// ---------------------------------------------------------------------
// STAFF: creates a Customer account (profiling). Status starts "pending"
// until an Admin verifies/approves it.
// POST /api/users/customers   (role: staff)
// ---------------------------------------------------------------------
async function createCustomerByStaff(req, res) {
  try {
    const {
      firstname,
      lastname,
      gender,
      age,
      contact_number,
      email,
      password,
    } = req.body;

    if (!firstname || !lastname || !gender || !age || !contact_number || !email || !password) {
      return res.status(400).json({ message: "All profile fields are required." });
    }

    const [existing] = await pool.query("CALL sp_get_user_by_email(?)", [email]);
    if (existing[0][0]) {
      return res.status(409).json({ message: "Email is already registered." });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      "CALL sp_create_customer_account(?, ?, ?, ?, ?, ?, ?, ?, @new_user_id)",
      [firstname, lastname, gender, age, contact_number, email, password_hash, req.user.id]
    );

    const [[{ new_user_id }]] = await pool.query("SELECT @new_user_id AS new_user_id");

    return res.status(201).json({
      message: "Customer account created. Awaiting Admin verification.",
      customer_id: new_user_id,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error creating customer." });
  }
}

// GET /api/users/customers/pending   (role: admin)
async function getPendingVerifications(req, res) {
  try {
    const [rows] = await pool.query("CALL sp_get_pending_verifications()");
    return res.json({ pending: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error fetching pending accounts." });
  }
}

// PATCH /api/users/customers/:id/verify   (role: admin)
// body: { decision: "approve" | "reject", remarks }
async function verifyCustomerAccount(req, res) {
  try {
    const { id } = req.params;
    const { decision, remarks } = req.body;

    if (!["approve", "reject"].includes(decision)) {
      return res.status(400).json({ message: "decision must be 'approve' or 'reject'." });
    }

    const status = decision === "approve" ? "active" : "rejected";

    await pool.query("CALL sp_verify_customer_account(?, ?, ?, ?)", [
      id,
      status,
      req.user.id,
      remarks || null,
    ]);

    return res.json({ message: `Customer account ${status}.` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error verifying account." });
  }
}

// GET /api/users/customers   (role: admin, staff)
async function listCustomers(req, res) {
  try {
    const [rows] = await pool.query("CALL sp_list_customers()");
    return res.json({ customers: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error listing customers." });
  }
}

// ---------------------------------------------------------------------
// ADMIN: creates a Staff account (staff accounts are created directly
// active, since Admin is the one creating them).
// POST /api/users/staff   (role: admin)
// ---------------------------------------------------------------------
async function createStaffByAdmin(req, res) {
  try {
    const { firstname, lastname, gender, age, contact_number, email, password } = req.body;

    if (!firstname || !lastname || !gender || !age || !contact_number || !email || !password) {
      return res.status(400).json({ message: "All profile fields are required." });
    }

    const [existing] = await pool.query("CALL sp_get_user_by_email(?)", [email]);
    if (existing[0][0]) {
      return res.status(409).json({ message: "Email is already registered." });
    }

    const password_hash = await bcrypt.hash(password, 10);

    await pool.query("CALL sp_create_staff_account(?, ?, ?, ?, ?, ?, ?, ?)", [
      firstname,
      lastname,
      gender,
      age,
      contact_number,
      email,
      password_hash,
      req.user.id,
    ]);

    return res.status(201).json({ message: "Staff account created." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error creating staff." });
  }
}

module.exports = {
  createCustomerByStaff,
  getPendingVerifications,
  verifyCustomerAccount,
  listCustomers,
  createStaffByAdmin,
};
