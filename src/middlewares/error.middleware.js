// src/middleware/error.middleware.js
const ErrorResponse = require('../utils/errorResponse');
const logger = require('../utils/logger');

/**
 * Error handling middleware
 * Handles different types of errors and sends appropriate responses
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error details
  logger.error(err.stack || err.message, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    ...(req.user && { userId: req.user.id })
  });

  // Handle specific error types
  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    error = new ErrorResponse(message, 404);
  }
  // Mongoose duplicate key
  else if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate field value: ${field} already exists`;
    error = new ErrorResponse(message, 400, { [field]: `${field} đã tồn tại` });
  }
  // Mongoose validation error
  else if (err.name === 'ValidationError') {
    const message = 'Validation failed';
    const errors = {};
    Object.values(err.errors).forEach(({ properties }) => {
      errors[properties.path] = properties.message;
    });
    error = new ErrorResponse(message, 400, errors);
  }
  // JWT errors
  else if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new ErrorResponse(message, 401);
  }
  else if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new ErrorResponse(message, 401);
  }
  
  // Handle errors from Joi or other validation libraries
  if (err.details) {
    // Joi validation error
    const message = 'Validation error';
    const errors = {};
    err.details.forEach(({ path, message: msg }) => {
      errors[path] = msg;
    });
    error = new ErrorResponse(message, 400, errors);
  }
  
  // Default to 500 server error
  if (!error.statusCode) {
    error = new ErrorResponse('Lỗi máy chủ', 500);
  }

  // Send error response
  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    ...(error.details && { errors: error.details }),
    // Only include stack trace in development
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

module.exports = errorHandler;