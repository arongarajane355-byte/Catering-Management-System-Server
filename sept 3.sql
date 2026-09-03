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

/*Table structure for table `booking_request_items` */

DROP TABLE IF EXISTS `booking_request_items`;

CREATE TABLE `booking_request_items` (
  `request_item_id` int(11) NOT NULL AUTO_INCREMENT,
  `request_id` int(11) NOT NULL,
  `service_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT '1',
  `unit_price` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  PRIMARY KEY (`request_item_id`),
  KEY `fk_bri_request` (`request_id`),
  KEY `fk_bri_service` (`service_id`),
  CONSTRAINT `fk_bri_request` FOREIGN KEY (`request_id`) REFERENCES `booking_requests` (`request_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bri_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`service_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Data for the table `booking_request_items` */

/*Table structure for table `booking_requests` */

DROP TABLE IF EXISTS `booking_requests`;

CREATE TABLE `booking_requests` (
  `request_id` int(11) NOT NULL AUTO_INCREMENT,
  `request_no` varchar(30) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `event_type` varchar(100) NOT NULL,
  `event_date` date NOT NULL,
  `venue_address` varchar(255) NOT NULL,
  `guest_count` int(11) NOT NULL,
  `special_requests` text,
  `estimated_budget` decimal(10,2) DEFAULT '0.00',
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `reviewed_by` int(11) DEFAULT NULL,
  `review_remarks` varchar(255) DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`request_id`),
  UNIQUE KEY `request_no` (`request_no`),
  KEY `fk_br_customer` (`customer_id`),
  KEY `fk_br_reviewer` (`reviewed_by`),
  CONSTRAINT `fk_br_customer` FOREIGN KEY (`customer_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_br_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Data for the table `booking_requests` */

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

/*Table structure for table `event_evaluations` */

DROP TABLE IF EXISTS `event_evaluations`;

CREATE TABLE `event_evaluations` (
  `evaluation_id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `food_quality_rating` tinyint(4) NOT NULL,
  `service_staff_rating` tinyint(4) NOT NULL,
  `punctuality_rating` tinyint(4) NOT NULL,
  `overall_rating` tinyint(4) NOT NULL,
  `feedback_comments` text,
  `recommend_to_others` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`evaluation_id`),
  UNIQUE KEY `order_id` (`order_id`),
  KEY `fk_ee_customer` (`customer_id`),
  CONSTRAINT `fk_ee_customer` FOREIGN KEY (`customer_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ee_order` FOREIGN KEY (`order_id`) REFERENCES `event_orders` (`order_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Data for the table `event_evaluations` */

/*Table structure for table `event_milestones` */

DROP TABLE IF EXISTS `event_milestones`;

CREATE TABLE `event_milestones` (
  `milestone_id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `milestone_name` varchar(150) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `target_sequence` int(11) NOT NULL DEFAULT '1',
  `weight_percentage` int(11) NOT NULL DEFAULT '20',
  `status` enum('pending','in_progress','completed') NOT NULL DEFAULT 'pending',
  `notes` text,
  `logged_by` int(11) DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`milestone_id`),
  KEY `fk_em_order` (`order_id`),
  KEY `fk_em_logger` (`logged_by`),
  CONSTRAINT `fk_em_logger` FOREIGN KEY (`logged_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_em_order` FOREIGN KEY (`order_id`) REFERENCES `event_orders` (`order_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Data for the table `event_milestones` */

/*Table structure for table `event_orders` */

DROP TABLE IF EXISTS `event_orders`;

CREATE TABLE `event_orders` (
  `order_id` int(11) NOT NULL AUTO_INCREMENT,
  `order_no` varchar(30) NOT NULL,
  `request_id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `coordinator_id` int(11) DEFAULT NULL,
  `event_type` varchar(100) NOT NULL,
  `event_date` date NOT NULL,
  `venue_address` varchar(255) NOT NULL,
  `guest_count` int(11) NOT NULL,
  `contract_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `progress_percentage` int(11) NOT NULL DEFAULT '0',
  `status` enum('confirmed','in_preparation','ready','in_progress','completed','closed') NOT NULL DEFAULT 'confirmed',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`order_id`),
  UNIQUE KEY `order_no` (`order_no`),
  KEY `fk_eo_request` (`request_id`),
  KEY `fk_eo_customer` (`customer_id`),
  KEY `fk_eo_coordinator` (`coordinator_id`),
  CONSTRAINT `fk_eo_coordinator` FOREIGN KEY (`coordinator_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_eo_customer` FOREIGN KEY (`customer_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_eo_request` FOREIGN KEY (`request_id`) REFERENCES `booking_requests` (`request_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Data for the table `event_orders` */

/*Table structure for table `event_requirements` */

DROP TABLE IF EXISTS `event_requirements`;

CREATE TABLE `event_requirements` (
  `requirement_id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `title` varchar(150) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `document_type` enum('downpayment_proof','signed_contract','menu_form','venue_permit','other') NOT NULL,
  `file_url` varchar(255) DEFAULT NULL,
  `submission_notes` text,
  `status` enum('pending','submitted','approved','rejected') NOT NULL DEFAULT 'pending',
  `reviewed_by` int(11) DEFAULT NULL,
  `review_remarks` varchar(255) DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`requirement_id`),
  KEY `fk_er_order` (`order_id`),
  KEY `fk_er_reviewer` (`reviewed_by`),
  CONSTRAINT `fk_er_order` FOREIGN KEY (`order_id`) REFERENCES `event_orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_er_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Data for the table `event_requirements` */

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
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=latin1;

/*Data for the table `notifications` */

insert  into `notifications`(`notification_id`,`user_id`,`message`,`is_read`,`created_at`) values (1,1,'New customer account \"Kevin Esto\" awaiting verification.',0,'2026-07-31 18:09:52'),(2,1,'New customer account \"Ara Arong\" awaiting verification.',0,'2026-07-31 18:22:41'),(3,1,'New customer account \"James Ronolo\" awaiting verification.',0,'2026-07-31 19:18:23'),(4,1,'New customer account \"Nilo Butay\" awaiting verification.',0,'2026-08-10 15:07:33'),(5,1,'New customer account \"Aira Lala\" awaiting verification.',0,'2026-08-10 15:16:01'),(6,1,'New customer account \"Tanjiro Kamado\" awaiting verification.',0,'2026-08-10 15:34:09'),(7,1,'New customer account \"Man Bomber\" awaiting verification.',0,'2026-08-10 16:06:54'),(8,1,'New customer account \"Melva Gumapac\" awaiting verification.',0,'2026-08-18 09:15:40'),(9,1,'New customer account \"Julie Ann Jale\" awaiting verification.',0,'2026-08-18 10:07:15'),(10,1,'New customer account \"ella ancog\" awaiting verification.',0,'2026-09-03 09:16:25');

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

insert  into `services`(`service_id`,`category_id`,`service_name`,`description`,`base_price`,`unit`,`image_url`,`is_active`,`created_at`) values (1,1,'Wedding Catering Package','Full catering service for weddings (Kasal).','25000.00','package','https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80',1,'2026-07-31 18:00:20'),(2,1,'Birthday Catering Package','Catering package for birthday celebrations.','12000.00','package','https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=600&q=80',1,'2026-07-31 18:00:20'),(3,1,'Baptismal Catering Package','Catering package for baptismal events.','10000.00','package','https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=600&q=80',1,'2026-07-31 18:00:20'),(4,1,'Family Reunion Package','Catering package for family reunions.','15000.00','package','https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=600&q=80',1,'2026-07-31 18:00:20'),(5,2,'Buffet Station Setup','Professional buffet station setup at the venue.','5000.00','package','https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=600&q=80',1,'2026-07-31 18:00:20'),(6,2,'Chafing Dish Provision','Rental and setup of chafing dishes.','150.00','unit','https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',1,'2026-07-31 18:00:20'),(7,2,'Serving Crew (per head)','Optional professional serving staff.','800.00','per head','https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=600&q=80',1,'2026-07-31 18:00:20'),(8,3,'Custom Cake','Personalized custom cake for the event.','2500.00','unit','https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=600&q=80',1,'2026-07-31 18:00:20'),(9,3,'Pastry Platter','Assorted pastry platter.','1800.00','platter','https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',1,'2026-07-31 18:00:20'),(10,3,'Drink Station (Juice/Coffee/Tea)','Beverage station for guests.','3500.00','package','https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',1,'2026-07-31 18:00:20'),(11,3,'Dessert Bar','Assorted dessert bar setup.','4500.00','package','https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',1,'2026-07-31 18:00:20'),(12,4,'Table Rental','Rental of event tables.','100.00','unit','https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=600&q=80',1,'2026-07-31 18:00:20'),(13,4,'Chair Rental','Rental of event chairs.','30.00','unit','https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80',1,'2026-07-31 18:00:20'),(14,4,'Tablecloth Rental','Rental of tablecloths.','50.00','unit','https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=600&q=80',1,'2026-07-31 18:00:20'),(15,4,'Plates & Glasses Set','Rental of plates and glasses per set.','20.00','set','https://images.unsplash.com/photo-1615865417236-d67f5ed658e6?auto=format&fit=crop&w=600&q=80',1,'2026-07-31 18:00:20'),(16,4,'Cutlery Set','Rental of cutlery per set.','15.00','set','https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?auto=format&fit=crop&w=600&q=80',1,'2026-07-31 18:00:20'),(17,4,'Serving Tray Rental','Rental of serving trays.','40.00','unit','https://images.unsplash.com/photo-1581349485608-9469926a8e5e?auto=format&fit=crop&w=600&q=80',1,'2026-07-31 18:00:20');

/*Table structure for table `users` */

DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_no` varchar(20) DEFAULT NULL,
  `firstname` varchar(50) NOT NULL,
  `middlename` varchar(50) DEFAULT NULL,
  `lastname` varchar(50) NOT NULL,
  `gender` enum('Male','Female','Other') NOT NULL,
  `age` int(11) NOT NULL,
  `contact_number` varchar(20) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL DEFAULT '',
  `role` enum('customer','staff','admin') NOT NULL DEFAULT 'customer',
  `account_status` enum('pending','verified','rejected','active','inactive') NOT NULL DEFAULT 'active',
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `customer_no` (`customer_no`),
  KEY `fk_users_created_by` (`created_by`),
  CONSTRAINT `fk_users_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=latin1;

/*Data for the table `users` */

insert  into `users`(`user_id`,`customer_no`,`firstname`,`middlename`,`lastname`,`gender`,`age`,`contact_number`,`email`,`password`,`role`,`account_status`,`created_by`,`created_at`,`updated_at`) values (1,NULL,'System',NULL,'Admin','Male',35,'09170000000','admin@gmail.com','$2a$10$WKAC90poQ6GBqNzg8oR5bO3xpqvglHqCNwcis52D0sYFx69fjw7HG','admin','active',NULL,'2026-07-31 18:00:20','2026-07-31 18:00:20'),(2,NULL,'John',NULL,'Staff','Male',29,'09171111111','staff@gmail.com','$2a$10$YUb1Oy8kNEGePwW5B0AdMestL/K.idtRMvm9rZVvLo0kV5qhgm/xG','staff','active',NULL,'2026-07-31 18:00:20','2026-07-31 18:00:20'),(3,'CUST-2026-0003','Maria',NULL,'Customer','Female',27,'09172222222','customer@gmail.com','$2a$10$rh6fBsXruSctysebECmxW.UJuXf63dVPsYwHwr5Utqh/4YUhAqbcu','customer','active',NULL,'2026-07-31 18:00:20','2026-08-10 16:52:11'),(4,'CUST-2026-0004','Kevin',NULL,'Esto','Male',25,'09223417787','kevin.esto@gmail.com','$2a$10$q5ArIHMth6aCoPCXM3GOdu3KH0lh.pu8lxoaia6O2j1d9K1QdNvzy','customer','verified',2,'2026-07-31 18:09:52','2026-07-31 18:10:25'),(5,'CUST-2026-0005','Ara',NULL,'Arong','Female',25,'09103940897','ara.arong@gmail.com','$2a$10$WrEUVYLYrHczYlzKyVP23.bH6SqTmbjPXOQfUY/i/odA6/g9Z.Pqq','customer','verified',2,'2026-07-31 18:22:41','2026-07-31 18:23:01'),(6,'CUST-2026-0006','James',NULL,'Ronolo','Other',25,'09223417787','james.ronolo@gmail.com','$2a$10$HZytUFjqEhE81e3mbPePl.rIPjhdtUgB3d1Q8t4DY5dv3sBIxa5Ue','customer','verified',2,'2026-07-31 19:18:23','2026-08-18 10:10:24'),(7,'CUST-2026-0007','Escartin','Sige','Tonio','Male',12,'09567852468','nilo.butay@gmail.com','$2a$10$C8JqAjoPcbXVDCsFjrqbkOdauwV4V1nT9XCV6PUFu08Xx3FqVxroi','customer','verified',NULL,'2026-08-10 15:07:32','2026-08-10 16:50:39'),(8,'CUST-2026-0008','Aira','Escartin','Lala','Female',25,'09103940890','aira.lala@gmail.com','$2a$10$qfN98hWdBTnChzhTr56w3O7Ogt9l5nB9mKNUrQcAjNCiHEUTp6cKm','customer','verified',NULL,'2026-08-10 15:16:01','2026-08-10 16:09:47'),(9,'CUST-2026-1115','Tanjiro','Kagura','Kamado','Male',55,'09556485787','tanjiro.kamado@gmail.com','$2a$10$QJdYheHLxRmPMU/6I7B0pu.GyMhAeMLIxEMAm0K8nMvj132HpDUEO','customer','verified',NULL,'2026-08-10 15:34:09','2026-08-10 15:37:06'),(10,'CUST-2026-3440','Man','Pop','Bomber','Male',22,'09558745828','man.bomber@gmail.com','$2a$10$/1ImaS1D9Y2Dc39o9xEXwedgBajDRRXjW/xM0Ocb/Vsj7ONEPrf2O','customer','verified',2,'2026-08-10 16:06:54','2026-08-10 16:08:21'),(11,'CUST-2026-4114','Melva','Banga','Gumapac','Female',23,'09105448547','melva.gumapac@gmail.com','$2a$10$eH2Ql.NUCvrYTlKt47L4Lu/B4FgKPszyQZ81dDThfIg5vtxqtthOW','customer','verified',NULL,'2026-08-18 09:15:40','2026-08-18 10:09:17'),(12,'CUST-2026-1577','Julie Ann','Duria','Jale','Female',22,'09676917105','julieann.jale@gmail.com','$2a$10$j7yZPhD1lyQfJ1vK7xAGfu6.YaAex8zWUnjegCi2KtM4c3ObIRKrm','customer','verified',NULL,'2026-08-18 10:07:15','2026-08-18 10:08:34'),(13,'CUST-2026-7499','ella','Sige','ancog','Female',22,'09556485787','ella.ancog@gmail.com','$2a$10$YTyO2f92pq0lMicGfY/5Q.gna3q7tIHaj6Cts9U/F4zcgJMCXQLT.','customer','verified',NULL,'2026-09-03 09:16:25','2026-09-03 09:19:10');

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
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=latin1;

/*Data for the table `verification_logs` */

insert  into `verification_logs`(`log_id`,`user_id`,`reviewed_by`,`action`,`remarks`,`action_date`) values (1,4,1,'approved','Documents & credentials verified by Admin.','2026-07-31 18:10:25'),(2,5,1,'approved','Documents & credentials verified by Admin.','2026-07-31 18:23:01'),(3,7,1,'approved','Documents & credentials verified by Admin.','2026-08-10 15:09:36'),(4,9,1,'approved','Documents & credentials verified by Admin.','2026-08-10 15:34:55'),(5,10,1,'approved','Documents & credentials verified by Admin.','2026-08-10 16:08:21'),(6,8,1,'approved','Documents & credentials verified by Admin.','2026-08-10 16:09:47'),(7,12,1,'approved','Documents & credentials verified by Admin.','2026-08-18 10:08:34'),(8,11,1,'approved','Documents & credentials verified by Admin.','2026-08-18 10:09:17'),(9,6,1,'approved','Documents & credentials verified by Admin.','2026-08-18 10:10:24'),(10,13,1,'approved','Documents & credentials verified by Admin.','2026-09-03 09:19:10');

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

/* Procedure structure for procedure `sp_approve_booking_request` */

/*!50003 DROP PROCEDURE IF EXISTS  `sp_approve_booking_request` */;

DELIMITER $$

/*!50003 CREATE DEFINER=`cms_db`@`%` PROCEDURE `sp_approve_booking_request`(
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
      END */$$
DELIMITER ;

/* Procedure structure for procedure `sp_complete_event_evaluation` */

/*!50003 DROP PROCEDURE IF EXISTS  `sp_complete_event_evaluation` */;

DELIMITER $$

/*!50003 CREATE DEFINER=`cms_db`@`%` PROCEDURE `sp_complete_event_evaluation`(
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

/* Procedure structure for procedure `sp_create_booking_request` */

/*!50003 DROP PROCEDURE IF EXISTS  `sp_create_booking_request` */;

DELIMITER $$

/*!50003 CREATE DEFINER=`cms_db`@`%` PROCEDURE `sp_create_booking_request`(
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
      END */$$
DELIMITER ;

/* Procedure structure for procedure `sp_create_customer_account` */

/*!50003 DROP PROCEDURE IF EXISTS  `sp_create_customer_account` */;

DELIMITER $$

/*!50003 CREATE DEFINER=`cms_db`@`%` PROCEDURE `sp_create_customer_account`(
  IN p_firstname VARCHAR(50),
  IN p_lastname VARCHAR(50),
  IN p_middlename VARCHAR(50),
  IN p_gender VARCHAR(10),
  IN p_age INT,
  IN p_contact_number VARCHAR(20),
  IN p_email VARCHAR(100),
  IN p_password_hash VARCHAR(255),
  IN p_staff_id INT,
  IN p_customer_no VARCHAR(20)
)
BEGIN
  DECLARE new_id INT;
  DECLARE v_cust_no VARCHAR(20);

  IF p_customer_no IS NOT NULL AND p_customer_no != '' THEN
    SET v_cust_no = p_customer_no;
  ELSE
    SET v_cust_no = NULL;
  END IF;

  INSERT INTO users (customer_no, firstname, middlename, lastname, gender, age, contact_number, email, password, role, account_status, created_by)
  VALUES (v_cust_no, p_firstname, p_middlename, p_lastname, p_gender, p_age, p_contact_number, p_email, p_password_hash, 'customer', 'pending', p_staff_id);

  SET new_id = LAST_INSERT_ID();

  IF v_cust_no IS NULL THEN
    SET v_cust_no = CONCAT('CUST-', YEAR(NOW()), '-', LPAD(new_id, 4, '0'));
    UPDATE users SET customer_no = v_cust_no WHERE user_id = new_id;
  END IF;

  INSERT INTO notifications (user_id, message)
    SELECT user_id, CONCAT('New customer account "', p_firstname, ' ', p_lastname, '" awaiting verification.')
    FROM users WHERE role = 'admin';

  SELECT new_id AS new_user_id, v_cust_no AS customer_no;
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

/* Procedure structure for procedure `sp_log_event_milestone` */

/*!50003 DROP PROCEDURE IF EXISTS  `sp_log_event_milestone` */;

DELIMITER $$

/*!50003 CREATE DEFINER=`cms_db`@`%` PROCEDURE `sp_log_event_milestone`(
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

/* Procedure structure for procedure `sp_review_requirement` */

/*!50003 DROP PROCEDURE IF EXISTS  `sp_review_requirement` */;

DELIMITER $$

/*!50003 CREATE DEFINER=`cms_db`@`%` PROCEDURE `sp_review_requirement`(
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
      END */$$
DELIMITER ;

/* Procedure structure for procedure `sp_submit_requirement` */

/*!50003 DROP PROCEDURE IF EXISTS  `sp_submit_requirement` */;

DELIMITER $$

/*!50003 CREATE DEFINER=`cms_db`@`%` PROCEDURE `sp_submit_requirement`(
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

/*!50003 CREATE DEFINER=`cms_db`@`%` PROCEDURE `sp_verify_customer_account`(
  IN p_user_id INT,
  IN p_admin_id INT,
  IN p_action VARCHAR(10),
  IN p_remarks VARCHAR(255),
  IN p_new_password_hash VARCHAR(255)
)
BEGIN
  IF p_action = 'approved' AND p_new_password_hash IS NOT NULL AND p_new_password_hash != '' THEN
    UPDATE users SET account_status = 'verified', password = p_new_password_hash WHERE user_id = p_user_id AND role = 'customer';
  ELSE
    UPDATE users SET account_status = IF(p_action = 'approved', 'verified', 'rejected') WHERE user_id = p_user_id AND role = 'customer';
  END IF;
  INSERT INTO verification_logs (user_id, reviewed_by, action, remarks) VALUES (p_user_id, p_admin_id, p_action, p_remarks);
END */$$
DELIMITER ;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
