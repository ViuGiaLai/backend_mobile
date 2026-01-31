const mongoose = require('mongoose');

const TourSchema = new mongoose.Schema({
  provider: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  thumbnail: {
    type: String,
    default: 'no-photo.jpg'
  },
  images: [String],
  duration: {
    type: String,
    required: [true, 'Please add duration']
  },
  priceAdult: {
    type: Number,
    required: [true, 'Please add adult price']
  },
  priceChild: {
    type: Number,
    required: [true, 'Please add child price']
  },
  departurePlace: {
    type: String,
    required: [true, 'Please add departure place']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Tour', TourSchema);
