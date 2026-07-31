const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { getServicesByCategory, createService } = require("../controllers/serviceController");

// Public - shown on the landing page grouped by category
router.get("/categories", getServicesByCategory);

// Admin only - manage the service catalog
router.post("/", authMiddleware, roleMiddleware("admin"), createService);

module.exports = router;
