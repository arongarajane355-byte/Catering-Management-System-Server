const mysql = require("mysql2/promise");
require("dotenv").config();

// Connection pool to MySQL (database + tables + stored procedures are
// defined in /DATABASE.md at the project root)
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log("MySQL connected:", process.env.DB_NAME);
    conn.release();
  } catch (err) {
    console.error("MySQL connection failed:", err.message);
  }
}

module.exports = { pool, testConnection };
