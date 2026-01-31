const mongoose = require('mongoose');
const ReviewSchema = new mongoose.Schema({
  reviewer: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
  targetId: { type: mongoose.Schema.ObjectId, required: true },
  targetType: { type: String, enum: ['guide', 'tour'], required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Review', ReviewSchema);