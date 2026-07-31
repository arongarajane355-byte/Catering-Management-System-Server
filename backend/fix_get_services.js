const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixGetServices() {
  // Use multipleStatements so we can embed semicolons inside the procedure body
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'cms_db',
    password: process.env.DB_PASS !== undefined ? process.env.DB_PASS : 'cms_db',
    database: process.env.DB_NAME || 'cms',
    multipleStatements: true
  });

  await conn.query('DROP PROCEDURE IF EXISTS sp_get_services_by_category;');
  console.log('Dropped sp_get_services_by_category');

  // With multipleStatements ON, we can properly delimit — send complete block
  const sql = [
    'DROP PROCEDURE IF EXISTS sp_get_services_by_category',
    'CREATE PROCEDURE sp_get_services_by_category()',
    'BEGIN',
    '  SELECT',
    '    c.category_id,',
    '    c.category_name,',
    '    c.description AS category_description,',
    '    s.service_id,',
    '    s.service_name,',
    '    s.description AS service_description,',
    '    s.base_price,',
    '    s.unit,',
    '    s.image_url',
    '  FROM service_categories c',
    '  JOIN services s ON s.category_id = c.category_id',
    '  WHERE c.is_active = TRUE AND s.is_active = TRUE',
    '  ORDER BY c.category_id, s.service_name;',
    'END'
  ].join('\n');

  try {
    await conn.query(sql);
    console.log('Created: sp_get_services_by_category');
  } catch(err) {
    console.error('FAILED:', err.message);
    // Fallback — try as a single SELECT-based view approach via direct query
    console.log('Trying fallback flat query version...');
    const fallback = `CREATE PROCEDURE sp_get_services_by_category()
BEGIN
SELECT c.category_id, c.category_name, c.description AS category_description, s.service_id, s.service_name, s.description AS service_description, s.base_price, s.unit, s.image_url FROM service_categories c JOIN services s ON s.category_id = c.category_id WHERE c.is_active = TRUE AND s.is_active = TRUE ORDER BY c.category_id, s.service_name;
END`;
    try {
      await conn.query(fallback);
      console.log('Created via fallback!');
    } catch(err2) {
      console.error('Fallback also failed:', err2.message);
    }
  }

  await conn.end();
  console.log('Done.');
}

fixGetServices().catch(console.error);
