-- ---------------------------------------------------------------------
-- Catering Management System — Additive Event Lifecycle Workflow Schema
-- ---------------------------------------------------------------------

USE `cms`;

-- Stage 1: Booking Requests / Inquiries
CREATE TABLE IF NOT EXISTS `booking_requests` (
  `request_id` INT(11) NOT NULL AUTO_INCREMENT,
  `request_no` VARCHAR(30) UNIQUE NOT NULL,
  `customer_id` INT(11) NOT NULL,
  `event_type` VARCHAR(100) NOT NULL,
  `event_date` DATE NOT NULL,
  `venue_address` VARCHAR(255) NOT NULL,
  `guest_count` INT(11) NOT NULL,
  `special_requests` TEXT DEFAULT NULL,
  `estimated_budget` DECIMAL(10,2) DEFAULT '0.00',
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `reviewed_by` INT(11) DEFAULT NULL,
  `review_remarks` VARCHAR(255) DEFAULT NULL,
  `reviewed_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`request_id`),
  KEY `fk_br_customer` (`customer_id`),
  KEY `fk_br_reviewer` (`reviewed_by`),
  CONSTRAINT `fk_br_customer` FOREIGN KEY (`customer_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_br_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Stage 1: Booking Request Items (Requested Packages & Services)
CREATE TABLE IF NOT EXISTS `booking_request_items` (
  `request_item_id` INT(11) NOT NULL AUTO_INCREMENT,
  `request_id` INT(11) NOT NULL,
  `service_id` INT(11) NOT NULL,
  `quantity` INT(11) NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `subtotal` DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (`request_item_id`),
  KEY `fk_bri_request` (`request_id`),
  KEY `fk_bri_service` (`service_id`),
  CONSTRAINT `fk_bri_request` FOREIGN KEY (`request_id`) REFERENCES `booking_requests` (`request_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bri_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`service_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Stage 2 & 3: Active Event Orders (Active Records / Placements Equivalent)
CREATE TABLE IF NOT EXISTS `event_orders` (
  `order_id` INT(11) NOT NULL AUTO_INCREMENT,
  `order_no` VARCHAR(30) UNIQUE NOT NULL,
  `request_id` INT(11) NOT NULL,
  `customer_id` INT(11) NOT NULL,
  `coordinator_id` INT(11) DEFAULT NULL,
  `event_type` VARCHAR(100) NOT NULL,
  `event_date` DATE NOT NULL,
  `venue_address` VARCHAR(255) NOT NULL,
  `guest_count` INT(11) NOT NULL,
  `contract_amount` DECIMAL(10,2) NOT NULL DEFAULT '0.00',
  `progress_percentage` INT(11) NOT NULL DEFAULT 0,
  `status` ENUM('confirmed', 'in_preparation', 'ready', 'in_progress', 'completed', 'closed') NOT NULL DEFAULT 'confirmed',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`order_id`),
  KEY `fk_eo_request` (`request_id`),
  KEY `fk_eo_customer` (`customer_id`),
  KEY `fk_eo_coordinator` (`coordinator_id`),
  CONSTRAINT `fk_eo_request` FOREIGN KEY (`request_id`) REFERENCES `booking_requests` (`request_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_eo_customer` FOREIGN KEY (`customer_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_eo_coordinator` FOREIGN KEY (`coordinator_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Stage 4: Event Requirements Checklist (Documents & Checklist Submit/Review Loop)
CREATE TABLE IF NOT EXISTS `event_requirements` (
  `requirement_id` INT(11) NOT NULL AUTO_INCREMENT,
  `order_id` INT(11) NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `document_type` ENUM('downpayment_proof', 'signed_contract', 'menu_form', 'venue_permit', 'other') NOT NULL,
  `file_url` VARCHAR(255) DEFAULT NULL,
  `submission_notes` TEXT DEFAULT NULL,
  `status` ENUM('pending', 'submitted', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `reviewed_by` INT(11) DEFAULT NULL,
  `review_remarks` VARCHAR(255) DEFAULT NULL,
  `submitted_at` DATETIME DEFAULT NULL,
  `reviewed_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`requirement_id`),
  KEY `fk_er_order` (`order_id`),
  KEY `fk_er_reviewer` (`reviewed_by`),
  CONSTRAINT `fk_er_order` FOREIGN KEY (`order_id`) REFERENCES `event_orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_er_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Stage 5: Event Milestones (Progress Logging against targets)
CREATE TABLE IF NOT EXISTS `event_milestones` (
  `milestone_id` INT(11) NOT NULL AUTO_INCREMENT,
  `order_id` INT(11) NOT NULL,
  `milestone_name` VARCHAR(150) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `target_sequence` INT(11) NOT NULL DEFAULT 1,
  `weight_percentage` INT(11) NOT NULL DEFAULT 20,
  `status` ENUM('pending', 'in_progress', 'completed') NOT NULL DEFAULT 'pending',
  `notes` TEXT DEFAULT NULL,
  `logged_by` INT(11) DEFAULT NULL,
  `completed_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`milestone_id`),
  KEY `fk_em_order` (`order_id`),
  KEY `fk_em_logger` (`logged_by`),
  CONSTRAINT `fk_em_order` FOREIGN KEY (`order_id`) REFERENCES `event_orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_em_logger` FOREIGN KEY (`logged_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Stage 6: Event Evaluations (Closeout & Client Satisfaction Feedback)
CREATE TABLE IF NOT EXISTS `event_evaluations` (
  `evaluation_id` INT(11) NOT NULL AUTO_INCREMENT,
  `order_id` INT(11) NOT NULL,
  `customer_id` INT(11) NOT NULL,
  `food_quality_rating` TINYINT(4) NOT NULL,
  `service_staff_rating` TINYINT(4) NOT NULL,
  `punctuality_rating` TINYINT(4) NOT NULL,
  `overall_rating` TINYINT(4) NOT NULL,
  `feedback_comments` TEXT DEFAULT NULL,
  `recommend_to_others` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`evaluation_id`),
  UNIQUE KEY `uk_eval_order` (`order_id`),
  KEY `fk_ee_customer` (`customer_id`),
  CONSTRAINT `fk_ee_order` FOREIGN KEY (`order_id`) REFERENCES `event_orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ee_customer` FOREIGN KEY (`customer_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
