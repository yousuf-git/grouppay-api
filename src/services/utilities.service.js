import { StatusCodes } from 'http-status-codes';

/**
 * Generate a standardized API response
 */
export const generateApiResponse = (res, statusCode, message, data = null, meta = null) => {
  const response = {
    status: statusCode < 400 ? 'success' : 'error',
    message,
    data
  };

  if (meta) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

/**
 * Handle success responses
 */
export const successResponse = (res, message = 'Success', data = null, meta = null) => {
  return generateApiResponse(res, StatusCodes.OK, message, data, meta);
};

/**
 * Handle error responses
 */
export const errorResponse = (res, statusCode = StatusCodes.INTERNAL_SERVER_ERROR, message = 'An error occurred', data = null) => {
  return generateApiResponse(res, statusCode, message, data);
};
