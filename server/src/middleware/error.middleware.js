export function notFoundHandler(request, _response, next) {
  const error = new Error(`Not found: ${request.method} ${request.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

export function errorHandler(error, _request, response, next) {
  if (response.headersSent) {
    return next(error);
  }

  let statusCode = Number.isInteger(error.statusCode) &&
    error.statusCode >= 400 &&
    error.statusCode < 600
      ? error.statusCode
      : 500;
  if (error.code === "23505") {
    statusCode = 409;
  }

  if (statusCode >= 500) {
    console.error(error);
  }

  return response.status(statusCode).json({
    status: "error",
    message: statusCode === 500
      ? "Internal server error"
      : statusCode === 409
        ? "A record with these details already exists."
        : error.message,
  });
}
