const Tour = require('../models/Tour.model');
exports.getTours = async (req, res) => {
  try {
    const tours = await Tour.find().populate('provider', 'firstName lastName');
    res.status(200).json({ success: true, data: tours });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
exports.createTour = async (req, res) => {
  try {
    req.body.provider = req.user.id;
    const tour = await Tour.create(req.body);
    res.status(201).json({ success: true, data: tour });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};