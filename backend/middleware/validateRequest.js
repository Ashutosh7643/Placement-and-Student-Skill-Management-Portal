const { validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');

/**
 * Checks express-validator results and returns structured 400 errors.
 */
function validateRequest(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) {
    return next();
  }

  const formattedErrors = result.array().map((err) => ({
    field: err.path || err.param,
    message: err.msg,
  }));

  return next(
    new ApiError(
      400,
      formattedErrors[0] ? formattedErrors[0].message : 'Validation failed',
      formattedErrors
    )
  );
}

module.exports = validateRequest;
