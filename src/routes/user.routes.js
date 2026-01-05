const express = require('express');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

// Placeholder for user specific routes like profile update, etc.
router.get('/profile', protect, (req, res) => {
  res.status(200).json({ success: true, data: req.user });
});

module.exports = router;
