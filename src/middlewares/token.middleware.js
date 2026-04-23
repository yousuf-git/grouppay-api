import { verifyToken } from '../services/token.service.js';
import { supabase } from '../database/database.js';
import { errorResponse } from '../services/utilities.service.js';
import { StatusCodes } from 'http-status-codes';

/**
 * Middleware to protect routes with JWT
 */
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return errorResponse(res, StatusCodes.UNAUTHORIZED, 'Not authorized, no token provided');
  }

  try {
    const decoded = verifyToken(token);

    if (!decoded) {
      return errorResponse(res, StatusCodes.UNAUTHORIZED, 'Not authorized, invalid token');
    }

    // Check if user still exists in database
    const { data: user, error } = await supabase
      .from('person')
      .select('person_id, email, fullname, username')
      .eq('person_id', decoded.id)
      .single();

    if (error || !user) {
      return errorResponse(res, StatusCodes.UNAUTHORIZED, 'User no longer exists');
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    return errorResponse(res, StatusCodes.UNAUTHORIZED, 'Not authorized, token failed');
  }
};
