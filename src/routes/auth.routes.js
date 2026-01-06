const express = require('express');
const { login, register, logout } = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);

// Protected routes
// Add your protected routes here

module.exports = router;