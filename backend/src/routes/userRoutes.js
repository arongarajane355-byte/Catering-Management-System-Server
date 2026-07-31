const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
  createCustomerByStaff,
  getPendingVerifications,
  verifyCustomerAccount,
  listCustomers,
  createStaffByAdmin,
} = require("../controllers/userController");

router.use(authMiddleware);

// Staff creates a customer profile (goes to "pending" until Admin verifies)
router.post("/customers", roleMiddleware("staff"), createCustomerByStaff);

// Admin verifies (approve/reject) a customer account created by Staff
router.get("/customers/pending", roleMiddleware("admin"), getPendingVerifications);
router.patch("/customers/:id/verify", roleMiddleware("admin"), verifyCustomerAccount);

// Admin & Staff can view the customer list
router.get("/customers", roleMiddleware("admin", "staff"), listCustomers);

// Admin creates Staff accounts
router.post("/staff", roleMiddleware("admin"), createStaffByAdmin);

module.exports = router;
