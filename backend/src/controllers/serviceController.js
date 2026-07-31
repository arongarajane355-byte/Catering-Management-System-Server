const { pool } = require("../config/db");

// GET /api/services/categories  (public - used by the landing page)
// Returns each category with its services nested inside.
async function getServicesByCategory(req, res) {
  try {
    const [rows] = await pool.query("CALL sp_get_services_by_category()");
    const flat = rows[0];

    const grouped = {};
    for (const row of flat) {
      if (!grouped[row.category_id]) {
        grouped[row.category_id] = {
          category_id: row.category_id,
          category_name: row.category_name,
          category_description: row.category_description,
          services: [],
        };
      }
      if (row.service_id) {
        grouped[row.category_id].services.push({
          service_id: row.service_id,
          name: row.service_name,
          description: row.service_description,
          price: row.price,
        });
      }
    }

    return res.json({ categories: Object.values(grouped) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error fetching services." });
  }
}

// POST /api/services   (role: admin) - add a new service under a category
async function createService(req, res) {
  try {
    const { category_id, name, description, price } = req.body;
    if (!category_id || !name || !price) {
      return res.status(400).json({ message: "category_id, name and price are required." });
    }
    await pool.query("CALL sp_create_service(?, ?, ?, ?)", [
      category_id,
      name,
      description || null,
      price,
    ]);
    return res.status(201).json({ message: "Service created." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error creating service." });
  }
}

module.exports = { getServicesByCategory, createService };
