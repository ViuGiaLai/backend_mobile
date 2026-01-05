const express = require('express');
const {
  createTrip,
  getTrips,
  updateTripStatus
} = require('../controllers/trip.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getTrips)
  .post(createTrip);

router.put('/:id/status', authorize('fellow'), updateTripStatus);

module.exports = router;
