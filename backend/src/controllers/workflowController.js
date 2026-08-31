const { pool } = require('../config/db');

// ── 1. BOOKING REQUESTS (Stage 1: Inquiries / Applications) ─────────────────

const createBookingRequest = async (req, res, next) => {
  try {
    const customerId = req.user.user_id;
    const {
      event_type,
      event_date,
      venue_address,
      guest_count,
      special_requests,
      estimated_budget,
      items
    } = req.body;

    if (!event_type || !event_date || !venue_address || !guest_count) {
      return res.status(400).json({ message: 'Event type, date, venue address, and guest count are required.' });
    }

    const [headerResult] = await pool.query(
      'CALL sp_create_booking_request(?, ?, ?, ?, ?, ?, ?)',
      [
        customerId,
        event_type,
        event_date,
        venue_address,
        parseInt(guest_count),
        special_requests || '',
        parseFloat(estimated_budget) || 0.00
      ]
    );

    const newRequestId = headerResult[0][0]?.new_request_id;
    const requestNo = headerResult[0][0]?.request_no;

    // Add items to booking_request_items
    if (items && Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        if (item.service_id && item.quantity > 0) {
          const [serviceRows] = await pool.query('SELECT base_price FROM services WHERE service_id = ?', [item.service_id]);
          const unitPrice = serviceRows.length > 0 ? serviceRows[0].base_price : (item.unit_price || 0);
          const subtotal = unitPrice * item.quantity;
          await pool.query(
            'INSERT INTO booking_request_items (request_id, service_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)',
            [newRequestId, item.service_id, item.quantity, unitPrice, subtotal]
          );
        }
      }
    }

    res.status(201).json({
      message: 'Event inquiry request submitted successfully.',
      request_id: newRequestId,
      request_no: requestNo
    });
  } catch (error) {
    next(error);
  }
};

const getBookingRequests = async (req, res, next) => {
  try {
    const { role, user_id } = req.user;
    let query = `
      SELECT br.*, u.firstname AS customer_firstname, u.lastname AS customer_lastname,
             u.contact_number AS customer_contact, u.email AS customer_email,
             rv.firstname AS reviewer_firstname, rv.lastname AS reviewer_lastname
      FROM booking_requests br
      JOIN users u ON br.customer_id = u.user_id
      LEFT JOIN users rv ON br.reviewed_by = rv.user_id
    `;
    const params = [];

    if (role === 'customer') {
      query += ' WHERE br.customer_id = ?';
      params.push(user_id);
    }

    query += ' ORDER BY br.created_at DESC';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

const getBookingRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [header] = await pool.query(`
      SELECT br.*, u.firstname AS customer_firstname, u.lastname AS customer_lastname,
             u.contact_number AS customer_contact, u.email AS customer_email,
             rv.firstname AS reviewer_firstname, rv.lastname AS reviewer_lastname
      FROM booking_requests br
      JOIN users u ON br.customer_id = u.user_id
      LEFT JOIN users rv ON br.reviewed_by = rv.user_id
      WHERE br.request_id = ?
    `, [id]);

    if (header.length === 0) {
      return res.status(404).json({ message: 'Booking request not found.' });
    }

    const [items] = await pool.query(`
      SELECT bri.*, s.service_name, s.unit, s.image_url
      FROM booking_request_items bri
      JOIN services s ON bri.service_id = s.service_id
      WHERE bri.request_id = ?
    `, [id]);

    res.json({
      ...header[0],
      items
    });
  } catch (error) {
    next(error);
  }
};

// ── 2. REVIEW & APPROVAL (Stage 2: Review action spawning active records) ────

const reviewBookingRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, remarks } = req.body;
    const reviewerId = req.user.user_id;

    if (!action || !['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ message: 'Valid action (approved/rejected) is required.' });
    }

    const [result] = await pool.query(
      'CALL sp_approve_booking_request(?, ?, ?, ?)',
      [id, reviewerId, action, remarks || '']
    );

    const outcome = result[0][0];

    res.json({
      message: `Booking request ${action} successfully.`,
      order_id: outcome?.order_id || null,
      order_no: outcome?.order_no || null,
      outcome: outcome?.outcome
    });
  } catch (error) {
    next(error);
  }
};

// ── 3. ACTIVE EVENT ORDERS (Stage 3: Placements / Active Records) ───────────

const getEventOrders = async (req, res, next) => {
  try {
    const { role, user_id } = req.user;
    let query = `
      SELECT eo.*, u.firstname AS customer_firstname, u.lastname AS customer_lastname,
             u.contact_number AS customer_contact, u.email AS customer_email,
             c.firstname AS coordinator_firstname, c.lastname AS coordinator_lastname,
             (SELECT COUNT(*) FROM event_requirements er WHERE er.order_id = eo.order_id AND er.status = 'approved') AS approved_requirements,
             (SELECT COUNT(*) FROM event_requirements er WHERE er.order_id = eo.order_id) AS total_requirements
      FROM event_orders eo
      JOIN users u ON eo.customer_id = u.user_id
      LEFT JOIN users c ON eo.coordinator_id = c.user_id
    `;
    const params = [];

    if (role === 'customer') {
      query += ' WHERE eo.customer_id = ?';
      params.push(user_id);
    }

    query += ' ORDER BY eo.event_date ASC, eo.created_at DESC';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

const getEventOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [orderRows] = await pool.query(`
      SELECT eo.*, u.firstname AS customer_firstname, u.lastname AS customer_lastname,
             u.contact_number AS customer_contact, u.email AS customer_email,
             c.firstname AS coordinator_firstname, c.lastname AS coordinator_lastname
      FROM event_orders eo
      JOIN users u ON eo.customer_id = u.user_id
      LEFT JOIN users c ON eo.coordinator_id = c.user_id
      WHERE eo.order_id = ?
    `, [id]);

    if (orderRows.length === 0) {
      return res.status(404).json({ message: 'Event order not found.' });
    }

    const [requirements] = await pool.query(`
      SELECT er.*, u.firstname AS reviewer_firstname, u.lastname AS reviewer_lastname
      FROM event_requirements er
      LEFT JOIN users u ON er.reviewed_by = u.user_id
      WHERE er.order_id = ?
      ORDER BY er.requirement_id ASC
    `, [id]);

    const [milestones] = await pool.query(`
      SELECT em.*, u.firstname AS logger_firstname, u.lastname AS logger_lastname
      FROM event_milestones em
      LEFT JOIN users u ON em.logged_by = u.user_id
      WHERE em.order_id = ?
      ORDER BY em.target_sequence ASC
    `, [id]);

    const [evaluations] = await pool.query(`
      SELECT ee.*, u.firstname AS customer_firstname, u.lastname AS customer_lastname
      FROM event_evaluations ee
      JOIN users u ON ee.customer_id = u.user_id
      WHERE ee.order_id = ?
    `, [id]);

    res.json({
      ...orderRows[0],
      requirements,
      milestones,
      evaluation: evaluations[0] || null
    });
  } catch (error) {
    next(error);
  }
};

// ── 4. REQUIREMENTS CHECKLIST (Stage 4: Documents Submit / Review Loop) ─────

const submitRequirement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { submission_notes } = req.body;
    let fileUrl = req.body.file_url || null;

    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
    }

    if (!fileUrl && (!submission_notes || submission_notes.trim() === '')) {
      return res.status(400).json({ message: 'File upload or submission notes are required.' });
    }

    await pool.query(
      'CALL sp_submit_requirement(?, ?, ?)',
      [id, fileUrl || '', submission_notes || '']
    );

    res.json({ message: 'Requirement submitted for review.' });
  } catch (error) {
    next(error);
  }
};

const reviewRequirement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, remarks } = req.body;
    const reviewerId = req.user.user_id;

    if (!action || !['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ message: 'Valid action (approved/rejected) is required.' });
    }

    await pool.query(
      'CALL sp_review_requirement(?, ?, ?, ?)',
      [id, reviewerId, action, remarks || '']
    );

    res.json({ message: `Requirement ${action} successfully.` });
  } catch (error) {
    next(error);
  }
};

// ── 5. EVENT MILESTONES (Stage 5: Incremental Progress Logging) ──────────────

const logMilestone = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const staffId = req.user.user_id;

    const validStatuses = ['pending', 'in_progress', 'completed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Valid status (pending, in_progress, completed) is required.' });
    }

    const [result] = await pool.query(
      'CALL sp_log_event_milestone(?, ?, ?, ?)',
      [id, staffId, status, notes || '']
    );

    const progressInfo = result[0][0];

    res.json({
      message: 'Milestone progress updated successfully.',
      progress_percentage: progressInfo?.progress_percentage
    });
  } catch (error) {
    next(error);
  }
};

// ── 6. EVALUATION & CLOSEOUT (Stage 6: Final Evaluation) ─────────────────────

const submitEvaluation = async (req, res, next) => {
  try {
    const { id } = req.params; // order_id
    const customerId = req.user.user_id;
    const {
      food_quality_rating,
      service_staff_rating,
      punctuality_rating,
      overall_rating,
      feedback_comments,
      recommend_to_others
    } = req.body;

    if (!food_quality_rating || !service_staff_rating || !punctuality_rating || !overall_rating) {
      return res.status(400).json({ message: 'All 4 rating categories (1-5 scale) are required.' });
    }

    await pool.query(
      'CALL sp_complete_event_evaluation(?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        customerId,
        parseInt(food_quality_rating),
        parseInt(service_staff_rating),
        parseInt(punctuality_rating),
        parseInt(overall_rating),
        feedback_comments || '',
        recommend_to_others === false || recommend_to_others === 0 ? 0 : 1
      ]
    );

    res.json({ message: 'Evaluation submitted successfully. Event order is now closed.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBookingRequest,
  getBookingRequests,
  getBookingRequestById,
  reviewBookingRequest,
  getEventOrders,
  getEventOrderById,
  submitRequirement,
  reviewRequirement,
  logMilestone,
  submitEvaluation
};
