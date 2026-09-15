function errorHandler(err, req, res, next) {
  console.error('[Error]', err.stack || err.message);

  // Avoid leaking database paths, stack traces, or secrets to client
  const isDev = process.env.NODE_ENV === 'development';
  const statusCode = err.status || 500;

  return res.status(statusCode).json({
    success: false,
    error: err.userMessage || err.message || 'An unexpected internal error occurred. Please try again.',
    ...(isDev && { debug: err.stack })
  });
}

module.exports = errorHandler;
