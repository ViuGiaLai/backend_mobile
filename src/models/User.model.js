const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Please add a first name']
  },
  lastName: {
    type: String,
    required: [true, 'Please add a last name']
  },
  country: {
    type: String,
    required: [true, 'Please add a country']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  role: {
    type: String,
    enum: ['user', 'fellow', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Check if user account is active
UserSchema.methods.isAccountActive = function() {
  return this.isActive !== false;
};

// Hash password before saving
UserSchema.methods.hashPassword = async function() {
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  return this;
};

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = async function() {
  try {
    this.lastLogin = Date.now();
    this.loginAttempts = 0;
    await this.save({ validateBeforeSave: false });
    
    return jwt.sign(
      { 
        id: this._id,
        role: this.role,
        isActive: this.isActive !== false
      }, 
      process.env.JWT_SECRET || 'default-secret-key', 
      { 
        expiresIn: process.env.JWT_EXPIRE || '30d'
      }
    );
  } catch (error) {
    console.error('JWT Token Error:', error);
    throw new Error('Failed to generate authentication token');
  }
};

// Match user entered password to hashed password
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
