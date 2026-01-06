// src/controllers/auth.controller.js
const User = require('../models/User.model');
const ErrorResponse = require('../utils/errorResponse');
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
exports.register = async (req, res) => {
  logger.info('Register request received', { body: req.body });

  try {
    // Validate input
    const { errors, isValid } = validateRegisterInput(req.body);
    if (!isValid) {
      logger.warn('Validation failed', { errors });
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors
      });
    }

    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logger.warn('Registration failed - Email already in use', { email });
      return res.status(400).json({
        success: false,
        message: 'Email đã được sử dụng'
      });
    }

    // Create user with hashed password
    const user = new User({
      name,
      email,
      password,
      role: role || 'user'
    });

    // Hash password and save
    await user.hashPassword();
    await user.save();

    logger.info('User registered successfully', { userId: user._id });
    
    // Generate token and send response
    const token = await user.getSignedJwtToken();
    
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    logger.error('Registration error:', { error: err.message, stack: err.stack });
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ nội bộ',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res) => {
  const { email, password } = req.body;

  // Validate email & password
  if (!email || !password) {
    logger.warn('Login failed - Missing credentials');
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp email và mật khẩu'
    });
  }

  try {
    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      logger.warn('Login failed - User not found', { email });
      return res.status(401).json({
        success: false,
        message: 'Thông tin đăng nhập không chính xác'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      logger.warn('Login failed - Invalid password', { email });
      return res.status(401).json({
        success: false,
        message: 'Thông tin đăng nhập không chính xác'
      });
    }

    // Check if user is active
    if (user.isActive === false) {
      logger.warn('Login failed - Account inactive', { userId: user._id });
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.'
      });
    }

    try {
      // Generate token and update user
      const token = await user.getSignedJwtToken();
      
      logger.info('Login successful', { userId: user._id });
      
      // Send response with token and user data
      res.status(200).json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      logger.error('Token generation error:', { error: error.message, stack: error.stack });
      return res.status(500).json({
        success: false,
        message: 'Lỗi tạo token xác thực',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  } catch (err) {
    logger.error('Login error:', { error: err.message, stack: err.stack });
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ nội bộ',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
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