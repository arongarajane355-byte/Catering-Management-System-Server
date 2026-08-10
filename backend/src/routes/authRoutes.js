const express = require('express');
const router = express.Router();
const { login, getMe, registerCustomer } = require('../controllers/authController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.post('/login', login);
router.post('/register', registerCustomer); // Public — no token required
router.get('/me', verifyToken, getMe);

module.exports = router;
