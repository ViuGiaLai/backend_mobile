// src/controllers/auth.controller.js
const User = require('../models/User.model');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async.middleware');
const logger = require('../utils/logger');

// Validation function
const validateRegisterInput = (data) => {
  const { name, email, password } = data;
  const errors = {};

  if (!name || name.trim().length === 0) {
    errors.name = 'Tên là bắt buộc';
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Email không hợp lệ';
  }

  if (!password || password.length < 6) {
    errors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  logger.info('Register request received', { body: req.body });

  // Validate input
  const { errors, isValid } = validateRegisterInput(req.body);
  if (!isValid) {
    logger.warn('Validation failed', { errors });
    return next(new ErrorResponse('Dữ liệu không hợp lệ', 400, errors));
  }

  const { name, email, password, role } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logger.warn('Registration failed - User already exists', { email });
      return next(new ErrorResponse('Email đã được sử dụng', 400));
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'user' // Default to 'user' if role is not provided
    });

    logger.info('User registered successfully', { userId: user._id });
    sendTokenResponse(user, 201, res);
  } catch (error) {
    logger.error('Registration error', { error: error.message });
    next(error);
  }
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  logger.info('Login attempt', { email: req.body.email });

  const { email, password } = req.body;

  // Validate email & password
  if (!email || !password) {
    logger.warn('Login failed - Missing credentials');
    return next(new ErrorResponse('Vui lòng cung cấp email và mật khẩu', 400));
  }

  // Check for user
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return next(new ErrorResponse('Thông tin đăng nhập không chính xác', 401));
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse('Thông tin đăng nhập không chính xác', 401));
  }

  // Check if user is admin
  if (user.role !== 'admin') {
    return next(new ErrorResponse('Không có quyền truy cập', 403));
  }

  sendTokenResponse(user, 200, res);
});

// @desc    Logout user / clear cookie
// @route   POST /api/v1/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    data: {},
  });
});

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  // Set token expiration to 30 days from now
  const daysToExpire = 30;
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + daysToExpire);

  const options = {
    expires: expirationDate,
    httpOnly: true,
    sameSite: 'strict',
    path: '/'
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token
    });
};