// src/controllers/auth.controller.js
const User = require('../models/User.model');
const ErrorResponse = require('../utils/errorResponse');
const logger = require('../utils/logger');

// Validation function updated for new fields
const validateRegisterInput = (data) => {
  const { firstName, lastName, country, email, password } = data;
  const errors = {};

  if (!firstName || firstName.trim().length === 0) {
    errors.firstName = 'First name is required';
  }
  if (!lastName || lastName.trim().length === 0) {
    errors.lastName = 'Last name is required';
  }
  if (!country || country.trim().length === 0) {
    errors.country = 'Country is required';
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Invalid email format';
  }
  if (!password || password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res) => {
  logger.info('Register request received', { body: req.body });

  try {
    // Validate input
    const { errors, isValid } = validateRegisterInput(req.body);
    if (!isValid) {
      logger.warn('Validation failed', { errors });
      return res.status(400).json({
        success: false,
        message: 'Invalid data provided',
        errors
      });
    }

    const { firstName, lastName, country, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logger.warn('Registration failed - Email already in use', { email });
      return res.status(400).json({
        success: false,
        message: 'Email is already in use'
      });
    }

    // Create user with new fields
    const user = new User({
      firstName,
      lastName,
      country,
      email,
      password,
      role: role || 'user'
    });

    // Hash password and save
    await user.hashPassword();
    await user.save();

    logger.info('User registered successfully', { userId: user._id });
    
    // Generate token
    const token = await user.getSignedJwtToken();
    
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    logger.error('Registration error:', { error: err.message, stack: err.stack });
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide email and password'
    });
  }

  try {
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Account is locked'
      });
    }

    const token = await user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};

// @desc    Forgot password
// @route   POST /api/v1/auth/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'There is no user with that email'
      });
    }

    // 1. Tạo reset token (sử dụng crypto)
    const resetToken = crypto.randomBytes(20).toString('hex');

    // 2. Hash và lưu vào database
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // 3. Set thời gian hết hạn (ví dụ: 10 phút)
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    // 4. Ở đây bạn sẽ tích hợp gửi Email thực tế (Nodemailer)
    // Ví dụ: await sendEmail({ email: user.email, subject: 'Password reset', message: resetToken });
    
    logger.info(`Password reset token generated for: ${email}`);

    res.status(200).json({
      success: true,
      message: 'Email sent'
    });
  } catch (err) {
    logger.error('Forgot password error:', err);
    res.status(500).json({
      success: false,
      message: 'Email could not be sent'
    });
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/v1/auth/logout
// @access  Private
exports.logout = (req, res) => {
  try {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      secure: process.env.NODE_ENV === 'production'
    });

    res.status(200).json({
      success: true,
      message: 'Đăng xuất thành công'
    });
  } catch (err) {
    logger.error('Logout error:', { error: err.message });
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi đăng xuất',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    secure: process.env.NODE_ENV === 'production'
  };

  // Remove password from output
  user.password = undefined;

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
};