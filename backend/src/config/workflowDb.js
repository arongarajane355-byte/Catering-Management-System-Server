const mysql = require('mysql2/promise');
const { pool } = require('./db');
require('dotenv').config();

async function initWorkflowDb() {
  try {
    const conn = await pool.getConnection();

    // 1. Create Stage 1 Tables: booking_requests & booking_request_items
    await conn.query(`
      CREATE TABLE IF NOT EXISTS booking_requests (
        request_id INT AUTO_INCREMENT PRIMARY KEY,
        request_no VARCHAR(30) UNIQUE NOT NULL,
        customer_id INT NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        event_date DATE NOT NULL,
        venue_address VARCHAR(255) NOT NULL,
        guest_count INT NOT NULL,
        special_requests TEXT DEFAULT NULL,
        estimated_budget DECIMAL(10,2) DEFAULT 0.00,
        status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
        reviewed_by INT DEFAULT NULL,
        review_remarks VARCHAR(255) DEFAULT NULL,
        reviewed_at DATETIME DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_br_customer FOREIGN KEY (customer_id) REFERENCES users(user_id) ON DELETE CASCADE,
        CONSTRAINT fk_br_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS booking_request_items (
        request_item_id INT AUTO_INCREMENT PRIMARY KEY,
        request_id INT NOT NULL,
        service_id INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        unit_price DECIMAL(10,2) NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        CONSTRAINT fk_bri_request FOREIGN KEY (request_id) REFERENCES booking_requests(request_id) ON DELETE CASCADE,
        CONSTRAINT fk_bri_service FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE CASCADE
      )
    `);

    // 2. Create Stage 2 & 3: Active Event Orders
    await conn.query(`
      CREATE TABLE IF NOT EXISTS event_orders (
        order_id INT AUTO_INCREMENT PRIMARY KEY,
        order_no VARCHAR(30) UNIQUE NOT NULL,
        request_id INT NOT NULL,
        customer_id INT NOT NULL,
        coordinator_id INT DEFAULT NULL,
        event_type VARCHAR(100) NOT NULL,
        event_date DATE NOT NULL,
        venue_address VARCHAR(255) NOT NULL,
        guest_count INT NOT NULL,
        contract_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        progress_percentage INT NOT NULL DEFAULT 0,
        status ENUM('confirmed', 'in_preparation', 'ready', 'in_progress', 'completed', 'closed') NOT NULL DEFAULT 'confirmed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_eo_request FOREIGN KEY (request_id) REFERENCES booking_requests(request_id) ON DELETE CASCADE,
        CONSTRAINT fk_eo_customer FOREIGN KEY (customer_id) REFERENCES users(user_id) ON DELETE CASCADE,
        CONSTRAINT fk_eo_coordinator FOREIGN KEY (coordinator_id) REFERENCES users(user_id) ON DELETE SET NULL
      )
    `);

    // 3. Create Stage 4: Event Requirements (Documents / Checklist)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS event_requirements (
        requirement_id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        title VARCHAR(150) NOT NULL,
        description VARCHAR(255) DEFAULT NULL,
        document_type ENUM('downpayment_proof', 'signed_contract', 'menu_form', 'venue_permit', 'other') NOT NULL,
        file_url VARCHAR(255) DEFAULT NULL,
        submission_notes TEXT DEFAULT NULL,
        status ENUM('pending', 'submitted', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
        reviewed_by INT DEFAULT NULL,
        review_remarks VARCHAR(255) DEFAULT NULL,
        submitted_at DATETIME DEFAULT NULL,
        reviewed_at DATETIME DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_er_order FOREIGN KEY (order_id) REFERENCES event_orders(order_id) ON DELETE CASCADE,
        CONSTRAINT fk_er_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL
      )
    `);

    // 4. Create Stage 5: Event Milestones (Progress Logging)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS event_milestones (
        milestone_id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        milestone_name VARCHAR(150) NOT NULL,
        description VARCHAR(255) DEFAULT NULL,
        target_sequence INT NOT NULL DEFAULT 1,
        weight_percentage INT NOT NULL DEFAULT 20,
        status ENUM('pending', 'in_progress', 'completed') NOT NULL DEFAULT 'pending',
        notes TEXT DEFAULT NULL,
        logged_by INT DEFAULT NULL,
        completed_at DATETIME DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_em_order FOREIGN KEY (order_id) REFERENCES event_orders(order_id) ON DELETE CASCADE,
        CONSTRAINT fk_em_logger FOREIGN KEY (logged_by) REFERENCES users(user_id) ON DELETE SET NULL
      )
    `);

    // 5. Create Stage 6: Event Evaluations (Closeout & Satisfaction)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS event_evaluations (
        evaluation_id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL UNIQUE,
        customer_id INT NOT NULL,
        food_quality_rating TINYINT NOT NULL,
        service_staff_rating TINYINT NOT NULL,
        punctuality_rating TINYINT NOT NULL,
        overall_rating TINYINT NOT NULL,
        feedback_comments TEXT DEFAULT NULL,
        recommend_to_others BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_ee_order FOREIGN KEY (order_id) REFERENCES event_orders(order_id) ON DELETE CASCADE,
        CONSTRAINT fk_ee_customer FOREIGN KEY (customer_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);

    conn.release();

    // Register stored procedures safely using a dedicated connection with multipleStatements: false
    const procConn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'cms_db',
      password: process.env.DB_PASS !== undefined ? process.env.DB_PASS : 'cms_db',
      database: process.env.DB_NAME || 'cms',
      multipleStatements: false
    });

    const workflowProcNames = [
      'sp_create_booking_request',
      'sp_approve_booking_request',
      'sp_submit_requirement',
      'sp_review_requirement',
      'sp_log_event_milestone',
      'sp_complete_event_evaluation'
    ];

    for (const name of workflowProcNames) {
      await procConn.query(`DROP PROCEDURE IF EXISTS ${name}`);
    }

    const workflowProcDefs = [
      // 1. Create Booking Request
      `CREATE PROCEDURE sp_create_booking_request(
        IN p_customer_id INT,
        IN p_event_type VARCHAR(100),
        IN p_event_date DATE,
        IN p_venue_address VARCHAR(255),
        IN p_guest_count INT,
        IN p_special_requests TEXT,
        IN p_estimated_budget DECIMAL(10,2)
      )
      BEGIN
        DECLARE new_id INT;
        DECLARE v_req_no VARCHAR(30);

        INSERT INTO booking_requests (
          request_no, customer_id, event_type, event_date, venue_address,
          guest_count, special_requests, estimated_budget, status
        ) VALUES (
          'TEMP-REQ', p_customer_id, p_event_type, p_event_date, p_venue_address,
          p_guest_count, p_special_requests, p_estimated_budget, 'pending'
        );

        SET new_id = LAST_INSERT_ID();
        SET v_req_no = CONCAT('REQ-', YEAR(NOW()), '-', LPAD(new_id, 4, '0'));
        UPDATE booking_requests SET request_no = v_req_no WHERE request_id = new_id;

        INSERT INTO notifications (user_id, message)
          SELECT user_id, CONCAT('New event inquiry "', v_req_no, '" submitted for ', p_event_type)
          FROM users WHERE role IN ('admin', 'staff');

        SELECT new_id AS new_request_id, v_req_no AS request_no;
      END`,

      // 2. Review and Approve Booking Request (Spawns active event_orders, default requirements, and milestones)
      `CREATE PROCEDURE sp_approve_booking_request(
        IN p_request_id INT,
        IN p_reviewer_id INT,
        IN p_action VARCHAR(10),
        IN p_remarks VARCHAR(255)
      )
      BEGIN
        DECLARE v_cust_id INT;
        DECLARE v_event_type VARCHAR(100);
        DECLARE v_event_date DATE;
        DECLARE v_venue VARCHAR(255);
        DECLARE v_guests INT;
        DECLARE v_amount DECIMAL(10,2);
        DECLARE v_new_order_id INT;
        DECLARE v_order_no VARCHAR(30);

        SELECT customer_id, event_type, event_date, venue_address, guest_count, estimated_budget
        INTO v_cust_id, v_event_type, v_event_date, v_venue, v_guests, v_amount
        FROM booking_requests WHERE request_id = p_request_id;

        IF p_action = 'approved' THEN
          UPDATE booking_requests
          SET status = 'approved', reviewed_by = p_reviewer_id, review_remarks = p_remarks, reviewed_at = NOW()
          WHERE request_id = p_request_id;

          -- Spawn Active Event Order
          INSERT INTO event_orders (
            order_no, request_id, customer_id, coordinator_id, event_type,
            event_date, venue_address, guest_count, contract_amount, progress_percentage, status
          ) VALUES (
            'TEMP-EVT', p_request_id, v_cust_id, p_reviewer_id, v_event_type,
            v_event_date, v_venue, v_guests, v_amount, 0, 'confirmed'
          );

          SET v_new_order_id = LAST_INSERT_ID();
          SET v_order_no = CONCAT('EVT-', YEAR(NOW()), '-', LPAD(v_new_order_id, 4, '0'));
          UPDATE event_orders SET order_no = v_order_no WHERE order_id = v_new_order_id;

          -- Auto-populate default Requirements Checklist
          INSERT INTO event_requirements (order_id, title, description, document_type, status) VALUES
            (v_new_order_id, 'Downpayment Deposit Proof', 'Proof of 50% reservation deposit payment via bank or GCash.', 'downpayment_proof', 'pending'),
            (v_new_order_id, 'Signed Catering Agreement', 'Signed copy of terms and conditions contract.', 'signed_contract', 'pending'),
            (v_new_order_id, 'Finalized Menu & Dietary Sheet', 'Approved dish list and guest dietary restrictions form.', 'menu_form', 'pending'),
            (v_new_order_id, 'Venue Ingress / Gate Pass Permit', 'Approved venue entry or clearance permit for setup staff.', 'venue_permit', 'pending');

          -- Auto-populate standard Execution Milestones
          INSERT INTO event_milestones (order_id, milestone_name, description, target_sequence, weight_percentage, status) VALUES
            (v_new_order_id, '1. Ingredient & Supply Procurement', 'Source fresh produce, meat, and dry ingredients from suppliers.', 1, 20, 'pending'),
            (v_new_order_id, '2. Kitchen Batch Prep & Cooking', 'Culinary preparation, seasoning, and packaging in commissary kitchen.', 2, 25, 'pending'),
            (v_new_order_id, '3. Venue Setup & Table Dressing', 'Chafing dishes, tablecloths, plates, and buffet station arrangement.', 3, 25, 'pending'),
            (v_new_order_id, '4. Buffet Service & Event Catering', 'Active food replenishment and waitstaff dining service.', 4, 20, 'pending'),
            (v_new_order_id, '5. Teardown & Post-Event Cleanup', 'Utensil packing, sanitation, and egress clearance.', 5, 10, 'pending');

          -- Notify customer
          INSERT INTO notifications (user_id, message) VALUES
            (v_cust_id, CONCAT('Your booking inquiry has been approved! Event order #', v_order_no, ' is now active.'));

          SELECT v_new_order_id AS order_id, v_order_no AS order_no, 'approved' AS outcome;
        ELSE
          UPDATE booking_requests
          SET status = 'rejected', reviewed_by = p_reviewer_id, review_remarks = p_remarks, reviewed_at = NOW()
          WHERE request_id = p_request_id;

          INSERT INTO notifications (user_id, message) VALUES
            (v_cust_id, CONCAT('Your booking inquiry for ', v_event_type, ' was not approved: ', p_remarks));

          SELECT NULL AS order_id, NULL AS order_no, 'rejected' AS outcome;
        END IF;
      END`,

      // 3. Submit Requirement Item
      `CREATE PROCEDURE sp_submit_requirement(
        IN p_requirement_id INT,
        IN p_file_url VARCHAR(255),
        IN p_submission_notes TEXT
      )
      BEGIN
        UPDATE event_requirements
        SET file_url = p_file_url,
            submission_notes = p_submission_notes,
            status = 'submitted',
            submitted_at = NOW()
        WHERE requirement_id = p_requirement_id;
      END`,

      // 4. Review Requirement Item
      `CREATE PROCEDURE sp_review_requirement(
        IN p_requirement_id INT,
        IN p_reviewer_id INT,
        IN p_action VARCHAR(10),
        IN p_remarks VARCHAR(255)
      )
      BEGIN
        UPDATE event_requirements
        SET status = IF(p_action = 'approved', 'approved', 'rejected'),
            reviewed_by = p_reviewer_id,
            review_remarks = p_remarks,
            reviewed_at = NOW()
        WHERE requirement_id = p_requirement_id;
      END`,

      // 5. Log Event Milestone & Auto-calculate Progress %
      `CREATE PROCEDURE sp_log_event_milestone(
        IN p_milestone_id INT,
        IN p_staff_id INT,
        IN p_status VARCHAR(20),
        IN p_notes TEXT
      )
      BEGIN
        DECLARE v_order_id INT;
        DECLARE v_total_progress INT;

        SELECT order_id INTO v_order_id FROM event_milestones WHERE milestone_id = p_milestone_id;

        UPDATE event_milestones
        SET status = p_status,
            notes = COALESCE(p_notes, notes),
            logged_by = p_staff_id,
            completed_at = IF(p_status = 'completed', NOW(), completed_at)
        WHERE milestone_id = p_milestone_id;

        -- Sum completed milestone weights
        SELECT COALESCE(SUM(weight_percentage), 0) INTO v_total_progress
        FROM event_milestones
        WHERE order_id = v_order_id AND status = 'completed';

        IF v_total_progress > 100 THEN
          SET v_total_progress = 100;
        END IF;

        UPDATE event_orders
        SET progress_percentage = v_total_progress,
            status = CASE
              WHEN v_total_progress >= 100 THEN 'completed'
              WHEN v_total_progress > 0 THEN 'in_preparation'
              ELSE status
            END
        WHERE order_id = v_order_id;

        SELECT v_order_id AS order_id, v_total_progress AS progress_percentage;
      END`,

      // 6. Complete Event Evaluation & Close Event
      `CREATE PROCEDURE sp_complete_event_evaluation(
        IN p_order_id INT,
        IN p_customer_id INT,
        IN p_food_rating INT,
        IN p_service_rating INT,
        IN p_punctuality_rating INT,
        IN p_overall_rating INT,
        IN p_comments TEXT,
        IN p_recommend TINYINT
      )
      BEGIN
        INSERT INTO event_evaluations (
          order_id, customer_id, food_quality_rating, service_staff_rating,
          punctuality_rating, overall_rating, feedback_comments, recommend_to_others
        ) VALUES (
          p_order_id, p_customer_id, p_food_rating, p_service_rating,
          p_punctuality_rating, p_overall_rating, p_comments, p_recommend
        )
        ON DUPLICATE KEY UPDATE
          food_quality_rating = VALUES(food_quality_rating),
          service_staff_rating = VALUES(service_staff_rating),
          punctuality_rating = VALUES(punctuality_rating),
          overall_rating = VALUES(overall_rating),
          feedback_comments = VALUES(feedback_comments),
          recommend_to_others = VALUES(recommend_to_others);

        UPDATE event_orders SET status = 'closed' WHERE order_id = p_order_id;
      END`
    ];

    for (const def of workflowProcDefs) {
      await procConn.query(def);
    }

    await procConn.end();
    console.log('Additive workflow tables & stored procedures initialized successfully.');
  } catch (error) {
    console.error('Error during workflow database initialization:', error);
  }
}

module.exports = {
  initWorkflowDb
};
