import { supabase } from '../../database/database.js';
import { successResponse, errorResponse } from '../../services/utilities.service.js';
import { getPaginationRange, getPaginationMeta } from '../../services/pagination.service.js';
import asyncHandler from '../../services/asynchandler.js';
import { StatusCodes } from 'http-status-codes';

/**
 * @swagger
 * tags:
 *   name: Appeals
 *   description: User dispute management
 */

/**
 * @swagger
 * /api/up/appeals:
 *   get:
 *     summary: Get my appeals
 *     tags: [Appeals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of appeals
 */
export const getAppeals = asyncHandler(async (req, res) => {
  const { page, pageSize, groupId, status } = req.query;
  const { from, to, limit, page: pageNum } = getPaginationRange(page, pageSize);

  let query = supabase
    .from('appeals')
    .select(`
      *,
      groups(group_id, name),
      person:person_id(person_id, fullname, email)
    `, { count: 'exact' })
    .eq('person_id', req.user.person_id);

  if (groupId) query = query.eq('group_id', groupId);
  if (status) query = query.eq('status', status);

  const { data: appeals, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  return successResponse(res, 'Appeals fetched successfully', appeals, getPaginationMeta(count, pageNum, limit));
});

/**
 * @swagger
 * /api/up/appeals:
 *   post:
 *     summary: Submit an appeal
 *     tags: [Appeals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [group_id, message]
 *             properties:
 *               group_id: { type: integer }
 *               message: { type: string }
 *               attachment_url: { type: string }
 *     responses:
 *       201:
 *         description: Appeal submitted
 */
export const createAppeal = asyncHandler(async (req, res) => {
  const { group_id, message, attachment_url } = req.body;

  const { data: appeal, error } = await supabase
    .from('appeals')
    .insert({
      group_id,
      person_id: req.user.person_id,
      message,
      attachment_url,
      status: 'OPEN'
    })
    .select()
    .single();

  if (error) throw error;

  const { data: admins } = await supabase
    .from('group_participants')
    .select('person_id')
    .eq('group_id', group_id)
    .eq('role', 'ADMIN');

  if (admins && admins.length > 0) {
    const { data: group } = await supabase.from('groups').select('name').eq('group_id', group_id).single();
    const notifications = admins.map(admin => ({
      receiver_id: admin.person_id,
      sender_id: req.user.person_id,
      type: 'APPEAL_CREATED',
      message: `${req.user.fullname} submitted an appeal in "${group?.name}"`,
      related_id: appeal.appeal_id,
      is_read: false
    }));

    await supabase.from('notifications').insert(notifications);
  }

  return successResponse(res, 'Appeal submitted successfully', appeal, null, StatusCodes.CREATED);
});
