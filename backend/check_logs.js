const { pool } = require('c:/Users/Antonio Jr/Documents/GitHub/Catering-Management-System-Server/backend/src/config/db');

async function test() {
  try {
    const [logs] = await pool.query(`SELECT * FROM audit_logs LIMIT 10`);
    console.log('AUDIT LOGS COUNT:', logs.length);
    console.log('SAMPLE LOG:', logs[0]);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit();
  }
}

test();
