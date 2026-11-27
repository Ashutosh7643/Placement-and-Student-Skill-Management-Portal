const mongoose = require('mongoose');

/**
 * Centralized Express error handler that formats Mongoose, validation, and custom ApiError responses.
 */
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || 500;
  let message = err.message || 'An unexpected server error occurred';
  let errors = err.errors || null;

  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    message = errors[0] ? errors[0].message : 'Validation error';
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid ${err.path} format`;
  } else if (err && err.code === 11000) {
    statusCode = 409;
    const duplicateFields = err.keyPattern ? Object.keys(err.keyPattern) : ['field'];
    message = `A record with this ${duplicateFields.join(', ')} already exists.`;
  }

  if (statusCode >= 500) {
    console.error('[Server Error]', err);
  }

  const payload = {
    success: false,
    message,
  };

  if (errors) {
    payload.errors = errors;
  }

  return res.status(statusCode).json(payload);
}

module.exports = errorHandler;
