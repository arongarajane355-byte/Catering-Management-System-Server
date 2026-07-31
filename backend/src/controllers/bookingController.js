const { pool } = require("../config/db");

/*
 * Booking lifecycle (the "three-way process"):
 *   1) INPUT      -> Customer submits a booking request (event details + chosen services).
 *   2) PROCESSING -> Staff/Admin reviews, confirms availability, assigns resources.
 *   3) OUTPUT     -> Booking is completed/served and an invoice/summary is generated.
 */

// POST /api/bookings   (role: customer)  -> stage = 'input'
async function createBooking(req, res) {
  try {
    const { event_type, event_date, venue, guest_count, notes, items } = req.body;
    // items = [{ service_id, quantity }]

    if (!event_type || !event_date || !venue || !items || items.length === 0) {
      return res.status(400).json({ message: "event_type, event_date, venue and items are required." });
    }

    const [result] = await pool.query(
      "CALL sp_create_booking(?, ?, ?, ?, ?, ?, @new_booking_id)",
      [req.user.id, event_type, event_date, venue, guest_count || null, notes || null]
    );
    const [[{ new_booking_id }]] = await pool.query("SELECT @new_booking_id AS new_booking_id");

    for (const item of items) {
      await pool.query("CALL sp_add_booking_item(?, ?, ?)", [
        new_booking_id,
        item.service_id,
        item.quantity || 1,
      ]);
    }

    return res.status(201).json({
      message: "Booking submitted (Input stage). Staff will process your request.",
      booking_id: new_booking_id,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error creating booking." });
  }
}

// GET /api/bookings/mine   (role: customer)
async function getMyBookings(req, res) {
  try {
    const [rows] = await pool.query("CALL sp_get_bookings_by_customer(?)", [req.user.id]);
    return res.json({ bookings: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error fetching bookings." });
  }
}

// GET /api/bookings   (role: staff, admin) - all bookings, optional ?stage=
async function getAllBookings(req, res) {
  try {
    const { stage } = req.query;
    const [rows] = await pool.query("CALL sp_get_all_bookings(?)", [stage || null]);
    return res.json({ bookings: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error fetching bookings." });
  }
}

// GET /api/bookings/:id   (role: any authenticated; customer restricted to their own)
async function getBookingById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query("CALL sp_get_booking_details(?)", [id]);
    const booking = rows[0][0];
    const items = rows[1];
    const history = rows[2];

    if (!booking) return res.status(404).json({ message: "Booking not found." });

    if (req.user.role === "customer" && booking.customer_id !== req.user.id) {
      return res.status(403).json({ message: "You cannot view this booking." });
    }

    return res.json({ booking, items, history });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error fetching booking." });
  }
}

// PATCH /api/bookings/:id/stage   (role: staff, admin)
// body: { stage: "processing" | "completed" | "cancelled", notes }
async function updateBookingStage(req, res) {
  try {
    const { id } = req.params;
    const { stage, notes } = req.body;

    const validStages = ["processing", "completed", "cancelled"];
    if (!validStages.includes(stage)) {
      return res.status(400).json({ message: `stage must be one of: ${validStages.join(", ")}` });
    }

    await pool.query("CALL sp_update_booking_stage(?, ?, ?, ?)", [
      id,
      stage,
      req.user.id,
      notes || null,
    ]);

    return res.json({ message: `Booking moved to '${stage}' stage.` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error updating booking stage." });
  }
}

module.exports = {
  createBooking,
  getMyBookings,
  getAllBookings,
  getBookingById,
  updateBookingStage,
};
