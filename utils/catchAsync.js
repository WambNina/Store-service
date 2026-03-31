/**
 * Async error handler wrapper
 * Wraps async route handlers to catch errors and pass them to next()
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = catchAsync;