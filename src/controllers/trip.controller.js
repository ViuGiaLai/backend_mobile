const Trip = require('../models/Trip.model');

// @desc    Create a trip request
// @route   POST /api/v1/trips
// @access  Private
exports.createTrip = async (req, res, next) => {
  try {
    req.body.user = req.user.id;

    const trip = await Trip.create(req.body);

    res.status(201).json({
      success: true,
      data: trip
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user trips
// @route   GET /api/v1/trips
// @access  Private
exports.getTrips = async (req, res, next) => {
  try {
    let query;

    if (req.user.role === 'fellow') {
      query = Trip.find({ fellow: req.user.id });
    } else {
      query = Trip.find({ user: req.user.id });
    }

    const trips = await query.populate({
      path: 'user fellow',
      select: 'name email'
    });

    res.status(200).json({
      success: true,
      count: trips.length,
      data: trips
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update trip status (Accept/Reject)
// @route   PUT /api/v1/trips/:id/status
// @access  Private (Fellow only)
exports.updateTripStatus = async (req, res, next) => {
  try {
    let trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }

    // Make sure user is the fellow for this trip
    if (trip.fellow.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'Not authorized to update this trip' });
    }

    trip = await Trip.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: trip
    });
  } catch (err) {
    next(err);
  }
};
