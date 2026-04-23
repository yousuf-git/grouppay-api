import { supabase } from '../../database/database.js';
import { successResponse, errorResponse } from '../../services/utilities.service.js';
import { getPaginationRange, getPaginationMeta } from '../../services/pagination.service.js';
import asyncHandler from '../../services/asynchandler.js';
import { StatusCodes } from 'http-status-codes';

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: User notification system
 */

/**
 * @swagger
 * /api/up/notifications:
 *   get:
 *     summary: Get all notifications for current user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: List of notifications
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const { page, pageSize } = req.query;
  const { from, to, limit, page: pageNum } = getPaginationRange(page, pageSize);

  const { data: notifications, error, count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('receiver_id', req.user.person_id)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  return successResponse(res, 'Notifications fetched successfully', notifications, getPaginationMeta(count, pageNum, limit));
});

/**
 * @swagger
 * /api/up/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Marked as read
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('notification_id', id)
    .eq('receiver_id', req.user.person_id);

  if (error) throw error;

  return successResponse(res, 'Notification marked as read');
});

/**
 * @swagger
 * /api/up/notifications/read-all:
 *   patch:
 *     summary: Mark all as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All marked as read
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('receiver_id', req.user.person_id)
    .eq('is_read', false);

  if (error) throw error;

  return successResponse(res, 'All notifications marked as read');
});
