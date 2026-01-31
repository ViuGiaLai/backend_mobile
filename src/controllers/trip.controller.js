const Trip = require('../models/Trip.model');
exports.getTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ user: req.user.id });
    res.status(200).json({ success: true, data: trips });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
exports.createTrip = async (req, res) => {
  try {
    req.body.user = req.user.id;
    const trip = await Trip.create(req.body);
    res.status(201).json({ success: true, data: trip });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};