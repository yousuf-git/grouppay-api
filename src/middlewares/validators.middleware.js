import { errorResponse } from '../services/utilities.service.js';
import { StatusCodes } from 'http-status-codes';

/**
 * Middleware to validate request body using Joi schema
 * @param {Object} schema - Joi validation schema
 */
export const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map((detail) => detail.message).join(', ');
    return errorResponse(res, StatusCodes.BAD_REQUEST, errorMessage);
  }

  next();
};
