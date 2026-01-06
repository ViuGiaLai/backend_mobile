const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./middlewares/error.middleware');
const asyncHandler = require('./middlewares/async.middleware');
const logger = require('./utils/logger');

// Route files
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const fellowRoutes = require('./routes/fellow.routes');
const tripRoutes = require('./routes/trip.routes');
const packageRoutes = require('./routes/package.routes');

const app = express();

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Dev logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Security & CORS
app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`, {
    body: req.body,
    query: req.query,
    params: req.params,
    headers: req.headers
  });
  next();
});

// ROOT ROUTE
app.get('/', (_, res) => {
  res.json({
    success: true,
    message: 'API đang chạy',
    version: '1.0.0'
  });
});

// Static files
app.use(express.static('src/public'));

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/fellows', fellowRoutes);
app.use('/api/v1/trips', tripRoutes);
app.use('/api/v1/packages', packageRoutes);

// Error handler
app.use(errorHandler);

module.exports = app;
