const express = require('express');
const { getTours, createTour } = require('../controllers/tour.controller');
const { protect } = require('../middlewares/auth.middleware');
const router = express.Router();
router.route('/').get(getTours).post(protect, createTour);
module.exports = router;