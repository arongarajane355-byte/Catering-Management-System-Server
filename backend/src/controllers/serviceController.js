const { pool } = require('../config/db');

// Public Landing Page — Get all active services grouped by category
const getServicesGrouped = async (req, res, next) => {
  try {
    const [results] = await pool.query('CALL sp_get_services_by_category()');
    const flatRows = results[0] || [];

    // Group rows by category
    const categoriesMap = {};

    flatRows.forEach(row => {
      if (!categoriesMap[row.category_id]) {
        categoriesMap[row.category_id] = {
          category_id: row.category_id,
          category_name: row.category_name,
          category_description: row.category_description,
          services: []
        };
      }
      if (row.service_id) {
        categoriesMap[row.category_id].services.push({
          service_id: row.service_id,
          service_name: row.service_name,
          service_description: row.service_description,
          base_price: parseFloat(row.base_price),
          unit: row.unit,
          image_url: row.image_url
        });
      }
    });

    res.json(Object.values(categoriesMap));
  } catch (error) {
    next(error);
  }
};

// Admin — Manage Categories
const getAllCategories = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM service_categories ORDER BY category_id ASC');
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const { category_name, description } = req.body;
    if (!category_name) {
      return res.status(400).json({ message: 'Category name is required.' });
    }
    await pool.query('INSERT INTO service_categories (category_name, description) VALUES (?, ?)', [category_name, description]);
    res.status(201).json({ message: 'Category created successfully.' });
  } catch (error) {
    next(error);
  }
};

// Admin — Manage Services
const getAllServices = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.*, c.category_name
      FROM services s
      JOIN service_categories c ON s.category_id = c.category_id
      ORDER BY s.service_id ASC
    `);
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

const createService = async (req, res, next) => {
  try {
    const { category_id, service_name, description, base_price, unit, image_url } = req.body;
    if (!category_id || !service_name || base_price === undefined) {
      return res.status(400).json({ message: 'Category, service name, and base price are required.' });
    }
    await pool.query(
      'INSERT INTO services (category_id, service_name, description, base_price, unit, image_url) VALUES (?, ?, ?, ?, ?, ?)',
      [category_id, service_name, description, base_price, unit || 'package', image_url || '']
    );
    res.status(201).json({ message: 'Service created successfully.' });
  } catch (error) {
    next(error);
  }
};

const updateService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category_id, service_name, description, base_price, unit, is_active } = req.body;

    await pool.query(
      'UPDATE services SET category_id = ?, service_name = ?, description = ?, base_price = ?, unit = ?, is_active = ? WHERE service_id = ?',
      [category_id, service_name, description, base_price, unit, is_active ? 1 : 0, id]
    );

    res.json({ message: 'Service updated successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getServicesGrouped,
  getAllCategories,
  createCategory,
  getAllServices,
  createService,
  updateService
};
