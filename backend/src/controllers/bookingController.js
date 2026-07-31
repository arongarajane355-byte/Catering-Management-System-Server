const { pool } = require('../config/db');

// Customer creates a new booking
const createBooking = async (req, res, next) => {
  try {
    const { event_type, event_date, venue_address, guest_count, items } = req.body;
    const customerId = req.user.user_id;

    if (!event_type || !event_date || !venue_address || !guest_count || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Event details and at least one service/item are required.' });
    }

    // Call stored procedure to create booking header
    const [headerResult] = await pool.query(
      'CALL sp_create_booking(?, ?, ?, ?, ?)',
      [customerId, event_type, event_date, venue_address, parseInt(guest_count)]
    );

    const newBookingId = headerResult[0][0]?.new_booking_id;

    // Add items using stored procedure sp_add_booking_item
    for (const item of items) {
      if (item.service_id && item.quantity > 0) {
        await pool.query(
          'CALL sp_add_booking_item(?, ?, ?)',
          [newBookingId, item.service_id, item.quantity]
        );
      }
    }

    // Fetch created booking header with calculated total
    const [bookingDetails] = await pool.query('SELECT * FROM bookings WHERE booking_id = ?', [newBookingId]);

    res.status(201).json({
      message: 'Booking created successfully.',
      booking: bookingDetails[0]
    });
  } catch (error) {
    next(error);
  }
};

// Get booking details by ID (with line items & payments)
const getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [header] = await pool.query(`
      SELECT b.*, u.firstname AS customer_firstname, u.lastname AS customer_lastname, u.email AS customer_email, u.contact_number AS customer_contact,
             s.firstname AS staff_firstname, s.lastname AS staff_lastname
      FROM bookings b
      JOIN users u ON b.customer_id = u.user_id
      LEFT JOIN users s ON b.handled_by = s.user_id
      WHERE b.booking_id = ?
    `, [id]);

    if (header.length === 0) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const [items] = await pool.query(`
      SELECT bi.*, s.service_name, s.unit
      FROM booking_items bi
      JOIN services s ON bi.service_id = s.service_id
      WHERE bi.booking_id = ?
    `, [id]);

    const [payments] = await pool.query(`
      SELECT p.*, u.firstname AS recorded_by_firstname, u.lastname AS recorded_by_lastname
      FROM payments p
      JOIN users u ON p.recorded_by = u.user_id
      WHERE p.booking_id = ?
      ORDER BY p.payment_date DESC
    `, [id]);

    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount_paid), 0);
    const balance = parseFloat(header[0].total_amount) - totalPaid;

    res.json({
      ...header[0],
      items,
      payments,
      total_paid: totalPaid,
      balance: balance < 0 ? 0 : balance
    });
  } catch (error) {
    next(error);
  }
};

// List bookings (role dependent)
const listBookings = async (req, res, next) => {
  try {
    const { role, user_id } = req.user;
    let query = `
      SELECT b.*, u.firstname AS customer_firstname, u.lastname AS customer_lastname, u.contact_number,
             s.firstname AS staff_firstname, s.lastname AS staff_lastname
      FROM bookings b
      JOIN users u ON b.customer_id = u.user_id
      LEFT JOIN users s ON b.handled_by = s.user_id
    `;
    let params = [];

    if (role === 'customer') {
      query += ' WHERE b.customer_id = ?';
      params.push(user_id);
    }

    query += ' ORDER BY b.created_at DESC';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

// Staff / Admin updates booking status
const updateBookingStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const staffId = req.user.user_id;

    const validStatuses = ['pending', 'confirmed', 'preparing', 'on_the_way', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value.' });
    }

    await pool.query(
      'CALL sp_update_booking_status(?, ?, ?)',
      [id, status, staffId]
    );

    res.json({ message: `Booking status updated to ${status}.` });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBooking,
  getBookingById,
  listBookings,
  updateBookingStatus
};
