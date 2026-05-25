import { supabase } from '../../database/database.js';
import { successResponse, errorResponse } from '../../services/utilities.service.js';
import asyncHandler from '../../services/asynchandler.js';
import { StatusCodes } from 'http-status-codes';

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User lookup and search (for invite flows etc.)
 */

/**
 * @swagger
 * /api/up/users/search:
 *   get:
 *     summary: Search users by email, name, or username
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *         description: Search query (email, fullname, or username)
 *     responses:
 *       200:
 *         description: Matching users (max 10)
 */
export const searchUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim().length < 2) {
    return errorResponse(res, StatusCodes.BAD_REQUEST, 'Search query must be at least 2 characters');
  }

  const { data, error } = await supabase
    .from('person')
    .select('person_id, fullname, email, username, profile_picture_url')
    .or(`fullname.ilike.%${q}%,email.ilike.%${q}%,username.ilike.%${q}%`)
    .neq('person_id', req.user.person_id)
    .limit(10);

  if (error) throw error;

  return successResponse(res, 'Users found', data || []);
});

/**
 * @swagger
 * /api/up/users/by-email:
 *   get:
 *     summary: Get user by exact email (for invite flow)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User public profile
 *       404:
 *         description: User not found
 */
export const getUserByEmail = asyncHandler(async (req, res) => {
  const { email } = req.query;

  if (!email) return errorResponse(res, StatusCodes.BAD_REQUEST, 'Email is required');

  const { data, error } = await supabase
    .from('person')
    .select('person_id, fullname, email, username, profile_picture_url')
    .eq('email', email.toLowerCase())
    .single();

  if (error || !data) {
    return errorResponse(res, StatusCodes.NOT_FOUND, 'No user found with this email');
  }

  return successResponse(res, 'User found', data);
});

/**
 * @swagger
 * /api/up/users/{id}:
 *   get:
 *     summary: Get user public profile by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: User public profile
 *       404:
 *         description: User not found
 */
export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('person')
    .select('person_id, fullname, email, username, profile_picture_url')
    .eq('person_id', id)
    .single();

  if (error || !data) {
    return errorResponse(res, StatusCodes.NOT_FOUND, 'User not found');
  }

  return successResponse(res, 'User fetched', data);
});
