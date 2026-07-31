const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
  createBooking,
  getMyBookings,
  getAllBookings,
  getBookingById,
  updateBookingStage,
} = require("../controllers/bookingController");

router.use(authMiddleware);

// Customer: Input stage
router.post("/", roleMiddleware("customer"), createBooking);
router.get("/mine", roleMiddleware("customer"), getMyBookings);

// Staff/Admin: Process & Output stages
router.get("/", roleMiddleware("staff", "admin"), getAllBookings);
router.patch("/:id/stage", roleMiddleware("staff", "admin"), updateBookingStage);

// Shared (role-checked inside controller for customer ownership)
router.get("/:id", getBookingById);

module.exports = router;
