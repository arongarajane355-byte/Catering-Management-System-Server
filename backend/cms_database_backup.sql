/*
SQLyog Ultimate v9.62 
MySQL - 5.7.43-log : Database - cms
*********************************************************************
*/

/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE DATABASE /*!32312 IF NOT EXISTS*/`cms` /*!40100 DEFAULT CHARACTER SET latin1 */;

USE `cms`;

/*Table structure for table `booking_items` */

DROP TABLE IF EXISTS `booking_items`;

CREATE TABLE `booking_items` (
  `item_id` int(11) NOT NULL AUTO_INCREMENT,
  `booking_id` int(11) NOT NULL,
  `service_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT '1',
  `unit_price` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  PRIMARY KEY (`item_id`),
  KEY `fk_bi_booking` (`booking_id`),
  KEY `fk_bi_service` (`service_id`),
  CONSTRAINT `fk_bi_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bi_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`service_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=latin1;

/*Data for the table `booking_items` */

insert  into `booking_items`(`item_id`,`booking_id`,`service_id`,`quantity`,`unit_price`,`subtotal`) values (1,1,1,1,'25000.00','25000.00'),(2,1,5,1,'5000.00','5000.00'),(3,2,8,1,'2500.00','2500.00'),(4,2,10,1,'3500.00','3500.00'),(5,2,8,1,'2500.00','2500.00'),(6,3,15,1,'20.00','20.00');

/*Table structure for table `bookings` */

DROP TABLE IF EXISTS `bookings`;

CREATE TABLE `bookings` (
  `booking_id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) NOT NULL,
  `handled_by` int(11) DEFAULT NULL,
  `event_type` varchar(100) NOT NULL,
  `event_date` date NOT NULL,
  `venue_address` varchar(255) NOT NULL,
  `guest_count` int(11) NOT NULL,
  `status` enum('pending','confirmed','preparing','on_the_way','completed','cancelled') NOT NULL DEFAULT 'pending',
  `total_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`booking_id`),
  KEY `fk_bookings_customer` (`customer_id`),
  KEY `fk_bookings_staff` (`handled_by`),
  CONSTRAINT `fk_bookings_customer` FOREIGN KEY (`customer_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bookings_staff` FOREIGN KEY (`handled_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1;

/*Data for the table `bookings` */

insert  into `bookings`(`booking_id`,`customer_id`,`handled_by`,`event_type`,`event_date`,`venue_address`,`guest_count`,`status`,`total_amount`,`created_at`,`updated_at`) values (1,4,NULL,'Birthday','2026-08-01','Zamora',10,'pending','30000.00','2026-07-31 18:13:08','2026-07-31 18:13:08'),(2,5,2,'Wedding','2026-08-08','Zamora',50,'preparing','8500.00','2026-07-31 18:25:16','2026-07-31 18:25:53'),(3,3,NULL,'Wedding','2026-08-08','capitol',50,'pending','20.00','2026-07-31 18:53:27','2026-07-31 18:53:27');

/*Table structure for table `notifications` */

DROP TABLE IF EXISTS `notifications`;

CREATE TABLE `notifications` (
  `notification_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `message` varchar(255) NOT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_id`),
  KEY `fk_notif_user` (`user_id`),
  CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1;

/*Data for the table `notifications` */

insert  into `notifications`(`notification_id`,`user_id`,`message`,`is_read`,`created_at`) values (1,1,'New customer account \"Kevin Esto\" awaiting verification.',0,'2026-07-31 18:09:52'),(2,1,'New customer account \"Ara Arong\" awaiting verification.',0,'2026-07-31 18:22:41'),(3,1,'New customer account \"James Ronolo\" awaiting verification.',0,'2026-07-31 19:18:23');

/*Table structure for table `payments` */

DROP TABLE IF EXISTS `payments`;

CREATE TABLE `payments` (
  `payment_id` int(11) NOT NULL AUTO_INCREMENT,
  `booking_id` int(11) NOT NULL,
  `amount_paid` decimal(10,2) NOT NULL,
  `payment_method` enum('cash','gcash','bank_transfer','card') NOT NULL DEFAULT 'cash',
  `reference_no` varchar(100) DEFAULT NULL,
  `recorded_by` int(11) NOT NULL,
  `payment_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_id`),
  KEY `fk_payments_booking` (`booking_id`),
  KEY `fk_payments_user` (`recorded_by`),
  CONSTRAINT `fk_payments_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payments_user` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;

/*Data for the table `payments` */

insert  into `payments`(`payment_id`,`booking_id`,`amount_paid`,`payment_method`,`reference_no`,`recorded_by`,`payment_date`) values (1,2,'4000.00','cash','',2,'2026-07-31 18:26:18'),(2,3,'5.00','cash','',2,'2026-07-31 18:54:31');

/*Table structure for table `service_categories` */

DROP TABLE IF EXISTS `service_categories`;

CREATE TABLE `service_categories` (
  `category_id` int(11) NOT NULL AUTO_INCREMENT,
  `category_name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `category_name` (`category_name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=latin1;

/*Data for the table `service_categories` */

insert  into `service_categories`(`category_id`,`category_name`,`description`,`is_active`,`created_at`) values (1,'Event Catering (Special Occasions)','Full-service food preparation and serving for personal celebrations.',1,'2026-07-31 18:00:20'),(2,'Food Delivery & On-Site Setup','Reliable delivery of food to the venue with professional setup.',1,'2026-07-31 18:00:20'),(3,'Dessert & Beverage Packages','Add-on packages to complement the main meal.',1,'2026-07-31 18:00:20'),(4,'Equipment & Utensil Rental','Provision of necessary dining and serving equipment.',1,'2026-07-31 18:00:20');

/*Table structure for table `services` */

DROP TABLE IF EXISTS `services`;

CREATE TABLE `services` (
  `service_id` int(11) NOT NULL AUTO_INCREMENT,
  `category_id` int(11) NOT NULL,
  `service_name` varchar(150) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `base_price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `unit` varchar(30) DEFAULT 'package',
  `image_url` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`service_id`),
  KEY `fk_services_category` (`category_id`),
  CONSTRAINT `fk_services_category` FOREIGN KEY (`category_id`) REFERENCES `service_categories` (`category_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=latin1;

/*Data for the table `services` */

insert  into `services`(`service_id`,`category_id`,`service_name`,`description`,`base_price`,`unit`,`image_url`,`is_active`,`created_at`) values (1,1,'Wedding Catering Package','Full catering service for weddings (Kasal).','25000.00','package',NULL,1,'2026-07-31 18:00:20'),(2,1,'Birthday Catering Package','Catering package for birthday celebrations.','12000.00','package',NULL,1,'2026-07-31 18:00:20'),(3,1,'Baptismal Catering Package','Catering package for baptismal events.','10000.00','package',NULL,1,'2026-07-31 18:00:20'),(4,1,'Family Reunion Package','Catering package for family reunions.','15000.00','package',NULL,1,'2026-07-31 18:00:20'),(5,2,'Buffet Station Setup','Professional buffet station setup at the venue.','5000.00','package',NULL,1,'2026-07-31 18:00:20'),(6,2,'Chafing Dish Provision','Rental and setup of chafing dishes.','150.00','unit',NULL,1,'2026-07-31 18:00:20'),(7,2,'Serving Crew (per head)','Optional professional serving staff.','800.00','per head',NULL,1,'2026-07-31 18:00:20'),(8,3,'Custom Cake','Personalized custom cake for the event.','2500.00','unit',NULL,1,'2026-07-31 18:00:20'),(9,3,'Pastry Platter','Assorted pastry platter.','1800.00','platter',NULL,1,'2026-07-31 18:00:20'),(10,3,'Drink Station (Juice/Coffee/Tea)','Beverage station for guests.','3500.00','package',NULL,1,'2026-07-31 18:00:20'),(11,3,'Dessert Bar','Assorted dessert bar setup.','4500.00','package',NULL,1,'2026-07-31 18:00:20'),(12,4,'Table Rental','Rental of event tables.','100.00','unit',NULL,1,'2026-07-31 18:00:20'),(13,4,'Chair Rental','Rental of event chairs.','30.00','unit',NULL,1,'2026-07-31 18:00:20'),(14,4,'Tablecloth Rental','Rental of tablecloths.','50.00','unit',NULL,1,'2026-07-31 18:00:20'),(15,4,'Plates & Glasses Set','Rental of plates and glasses per set.','20.00','set',NULL,1,'2026-07-31 18:00:20'),(16,4,'Cutlery Set','Rental of cutlery per set.','15.00','set',NULL,1,'2026-07-31 18:00:20'),(17,4,'Serving Tray Rental','Rental of serving trays.','40.00','unit',NULL,1,'2026-07-31 18:00:20');

/*Table structure for table `users` */

DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `firstname` varchar(50) NOT NULL,
  `lastname` varchar(50) NOT NULL,
  `gender` enum('Male','Female','Other') NOT NULL,
  `age` int(11) NOT NULL,
  `contact_number` varchar(20) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('customer','staff','admin') NOT NULL DEFAULT 'customer',
  `account_status` enum('pending','verified','rejected','active','inactive') NOT NULL DEFAULT 'active',
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_users_created_by` (`created_by`),
  CONSTRAINT `fk_users_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=latin1;

/*Data for the table `users` */

insert  into `users`(`user_id`,`firstname`,`lastname`,`gender`,`age`,`contact_number`,`email`,`password`,`role`,`account_status`,`created_by`,`created_at`,`updated_at`) values (1,'System','Admin','Male',35,'09170000000','admin@cms.com','$2a$10$WKAC90poQ6GBqNzg8oR5bO3xpqvglHqCNwcis52D0sYFx69fjw7HG','admin','active',NULL,'2026-07-31 18:00:20','2026-07-31 18:00:20'),(2,'John','Staff','Male',29,'09171111111','staff@cms.com','$2a$10$YUb1Oy8kNEGePwW5B0AdMestL/K.idtRMvm9rZVvLo0kV5qhgm/xG','staff','active',NULL,'2026-07-31 18:00:20','2026-07-31 18:00:20'),(3,'Maria','Customer','Female',27,'09172222222','customer@cms.com','$2a$10$rh6fBsXruSctysebECmxW.UJuXf63dVPsYwHwr5Utqh/4YUhAqbcu','customer','verified',NULL,'2026-07-31 18:00:20','2026-07-31 18:00:20'),(4,'Kevin','Esto','Male',25,'09223417787','kevin@cms.com','$2a$10$q5ArIHMth6aCoPCXM3GOdu3KH0lh.pu8lxoaia6O2j1d9K1QdNvzy','customer','verified',2,'2026-07-31 18:09:52','2026-07-31 18:10:25'),(5,'Ara','Arong','Female',25,'09103940897','ara@cms.com','$2a$10$WrEUVYLYrHczYlzKyVP23.bH6SqTmbjPXOQfUY/i/odA6/g9Z.Pqq','customer','verified',2,'2026-07-31 18:22:41','2026-07-31 18:23:01'),(6,'James','Ronolo','Other',25,'09223417787','james.ronolo@cms.com','$2a$10$QXZb2Y3W6sjpGLEHAJH1..Aiio7.9AtlxJVczONSscJYAqSP1akVW','customer','pending',2,'2026-07-31 19:18:23','2026-07-31 19:18:23');

/*Table structure for table `verification_logs` */

DROP TABLE IF EXISTS `verification_logs`;

CREATE TABLE `verification_logs` (
  `log_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `reviewed_by` int(11) NOT NULL,
  `action` enum('approved','rejected') NOT NULL,
  `remarks` varchar(255) DEFAULT NULL,
  `action_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `fk_vl_user` (`user_id`),
  KEY `fk_vl_admin` (`reviewed_by`),
  CONSTRAINT `fk_vl_admin` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_vl_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;

/*Data for the table `verification_logs` */

insert  into `verification_logs`(`log_id`,`user_id`,`reviewed_by`,`action`,`remarks`,`action_date`) values (1,4,1,'approved','Documents & credentials verified by Admin.','2026-07-31 18:10:25'),(2,5,1,'approved','Documents & credentials verified by Admin.','2026-07-31 18:23:01');

/* Procedure structure for procedure `sp_add_booking_item` */

/*!50003 DROP PROCEDURE IF EXISTS  `sp_add_booking_item` */;

DELIMITER $$

/*!50003 CREATE DEFINER=`cms_db`@`%` PROCEDURE `sp_add_booking_item`(IN p_booking_id INT, IN p_service_id INT, IN p_quantity INT)
BEGIN
DECLARE v_price DECIMAL(10,2);
SELECT base_price INTO v_price FROM services WHERE service_id = p_service_id;
INSERT INTO booking_items (booking_id, service_id, quantity, unit_price, subtotal) VALUES (p_booking_id, p_service_id, p_quantity, v_price, v_price * p_quantity);
UPDATE bookings b SET total_amount = (SELECT COALESCE(SUM(subtotal), 0) FROM booking_items WHERE booking_id = p_booking_id) WHERE b.booking_id = p_booking_id;
END */$$
DELIMITER ;

/* Procedure structure for procedure `sp_admin_dashboard_summary` */

/*!50003 DROP PROCEDURE IF EXISTS  `sp_admin_dashboard_summary` */;

DELIMITER $$

/*!50003 CREATE DEFINER=`cms_db`@`%` PROCEDURE `sp_admin_dashboard_summary`()
BEGIN
SELECT (SELECT COUNT(*) FROM users WHERE role = 'customer' AND account_status = 'pending') AS pending_verifications, (SELECT COUNT(*) FROM bookings WHERE status = 'pending') AS pending_bookings, (SELECT COUNT(*) FROM bookings WHERE status = 'completed') AS completed_bookings, (SELECT COALESCE(SUM(amount_paid), 0) FROM payments) AS total_revenue;
END */$$
DELIMITER ;

/* Procedure structure for procedure `sp_create_booking` */

/*!50003 DROP PROCEDURE IF EXISTS  `sp_create_booking` */;

DELIMITER $$

/*!50003 CREATE DEFINER=`cms_db`@`%` PROCEDURE `sp_create_booking`(IN p_customer_id INT, IN p_event_type VARCHAR(100), IN p_event_date DATE, IN p_venue_address VARCHAR(255), IN p_guest_count INT)
BEGIN
INSERT INTO bookings (customer_id, event_type, event_date, venue_address, guest_count, status) VALUES (p_customer_id, p_event_type, p_event_date, p_venue_address, p_guest_count, 'pending');
SELECT LAST_INSERT_ID() AS new_booking_id;
END */$$
DELIMITER ;

/* Procedure structure for procedure `sp_create_customer_account` */

/*!50003 DROP PROCEDURE IF EXISTS  `sp_create_customer_account` */;

DELIMITER $$

/*!50003 CREATE DEFINER=`cms_db`@`%` PROCEDURE `sp_create_customer_account`(IN p_firstname VARCHAR(50), IN p_lastname VARCHAR(50), IN p_gender VARCHAR(10), IN p_age INT, IN p_contact_number VARCHAR(20), IN p_email VARCHAR(100), IN p_password_hash VARCHAR(255), IN p_staff_id INT)
BEGIN
INSERT INTO users (firstname, lastname, gender, age, contact_number, email, password, role, account_status, created_by) VALUES (p_firstname, p_lastname, p_gender, p_age, p_contact_number, p_email, p_password_hash, 'customer', 'pending', p_staff_id);
INSERT INTO notifications (user_id, message) SELECT user_id, CONCAT('New customer account "', p_firstname, ' ', p_lastname, '" awaiting verification.') FROM users WHERE role = 'admin';
SELECT LAST_INSERT_ID() AS new_user_id;
END */$$
DELIMITER ;

/* Procedure structure for procedure `sp_get_services_by_category` */

/*!50003 DROP PROCEDURE IF EXISTS  `sp_get_services_by_category` */;

DELIMITER $$

/*!50003 CREATE DEFINER=`cms_db`@`%` PROCEDURE `sp_get_services_by_category`()
BEGIN
SELECT c.category_id, c.category_name, c.description AS category_description, s.service_id, s.service_name, s.description AS service_description, s.base_price, s.unit, s.image_url FROM service_categories c JOIN services s ON s.category_id = c.category_id WHERE c.is_active = TRUE AND s.is_active = TRUE ORDER BY c.category_id, s.service_name;
END */$$
DELIMITER ;

/* Procedure structure for procedure `sp_record_payment` */

/*!50003 DROP PROCEDURE IF EXISTS  `sp_record_payment` */;

DELIMITER $$

/*!50003 CREATE DEFINER=`cms_db`@`%` PROCEDURE `sp_record_payment`(IN p_booking_id INT, IN p_amount_paid DECIMAL(10,2), IN p_payment_method VARCHAR(20), IN p_reference_no VARCHAR(100), IN p_recorded_by INT)
BEGIN
DECLARE v_total DECIMAL(10,2);
DECLARE v_paid DECIMAL(10,2);
INSERT INTO payments (booking_id, amount_paid, payment_method, reference_no, recorded_by) VALUES (p_booking_id, p_amount_paid, p_payment_method, p_reference_no, p_recorded_by);
SELECT total_amount INTO v_total FROM bookings WHERE booking_id = p_booking_id;
SELECT COALESCE(SUM(amount_paid), 0) INTO v_paid FROM payments WHERE booking_id = p_booking_id;
SELECT v_total AS total_amount, v_paid AS total_paid, (v_total - v_paid) AS balance;
END */$$
DELIMITER ;

/* Procedure structure for procedure `sp_update_booking_status` */

/*!50003 DROP PROCEDURE IF EXISTS  `sp_update_booking_status` */;

DELIMITER $$

/*!50003 CREATE DEFINER=`cms_db`@`%` PROCEDURE `sp_update_booking_status`(IN p_booking_id INT, IN p_status VARCHAR(20), IN p_staff_id INT)
BEGIN
UPDATE bookings SET status = p_status, handled_by = COALESCE(p_staff_id, handled_by) WHERE booking_id = p_booking_id;
END */$$
DELIMITER ;

/* Procedure structure for procedure `sp_verify_customer_account` */

/*!50003 DROP PROCEDURE IF EXISTS  `sp_verify_customer_account` */;

DELIMITER $$

/*!50003 CREATE DEFINER=`cms_db`@`%` PROCEDURE `sp_verify_customer_account`(IN p_user_id INT, IN p_admin_id INT, IN p_action VARCHAR(10), IN p_remarks VARCHAR(255))
BEGIN
UPDATE users SET account_status = IF(p_action = 'approved', 'verified', 'rejected') WHERE user_id = p_user_id AND role = 'customer';
INSERT INTO verification_logs (user_id, reviewed_by, action, remarks) VALUES (p_user_id, p_admin_id, p_action, p_remarks);
END */$$
DELIMITER ;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
