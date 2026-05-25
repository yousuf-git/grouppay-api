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

/**
 * @swagger
 * /api/up/appeals/{id}:
 *   get:
 *     summary: Get appeal by ID
 *     tags: [Appeals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Appeal details
 */
export const getAppealById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: appeal, error } = await supabase
    .from('appeals')
    .select(`
      *,
      groups(group_id, name),
      person:person_id(person_id, fullname, email)
    `)
    .eq('appeal_id', id)
    .single();

  if (error || !appeal) return errorResponse(res, StatusCodes.NOT_FOUND, 'Appeal not found');

  const { data: participant } = await supabase
    .from('group_participants')
    .select('role')
    .eq('group_id', appeal.group_id)
    .eq('person_id', req.user.person_id)
    .single();

  if (!participant && appeal.person_id !== req.user.person_id) {
    return errorResponse(res, StatusCodes.FORBIDDEN, 'Access denied');
  }

  return successResponse(res, 'Appeal fetched successfully', appeal);
});

/**
 * @swagger
 * /api/up/appeals/{id}:
 *   patch:
 *     summary: Update appeal (admin updates status/comment; sender can update message while OPEN)
 *     tags: [Appeals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string, enum: [OPEN, UNDER_REVIEW, CLOSED] }
 *               comment: { type: string }
 *               message: { type: string }
 *     responses:
 *       200:
 *         description: Appeal updated
 */
export const updateAppeal = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, comment, message } = req.body;

  const { data: appeal, error: fetchError } = await supabase
    .from('appeals')
    .select('*')
    .eq('appeal_id', id)
    .single();

  if (fetchError || !appeal) return errorResponse(res, StatusCodes.NOT_FOUND, 'Appeal not found');

  const { data: participant } = await supabase
    .from('group_participants')
    .select('role')
    .eq('group_id', appeal.group_id)
    .eq('person_id', req.user.person_id)
    .single();

  const isAdmin = participant?.role === 'ADMIN';
  const isOwner = appeal.person_id === req.user.person_id;

  if (!isAdmin && !isOwner) {
    return errorResponse(res, StatusCodes.FORBIDDEN, 'Access denied');
  }

  const updates = {};
  if (isAdmin && status) updates.status = status;
  if (isAdmin && comment !== undefined) updates.comment = comment;
  if (isOwner && message && appeal.status === 'OPEN') updates.message = message;

  if (Object.keys(updates).length === 0) {
    return errorResponse(res, StatusCodes.BAD_REQUEST, 'No valid updates provided');
  }

  updates.updated_at = new Date().toISOString();

  const { data: updatedAppeal, error: updateError } = await supabase
    .from('appeals')
    .update(updates)
    .eq('appeal_id', id)
    .select()
    .single();

  if (updateError) throw updateError;

  if (isAdmin && (status || comment !== undefined)) {
    await supabase.from('notifications').insert({
      receiver_id: appeal.person_id,
      sender_id: req.user.person_id,
      type: 'APPEAL_STATUS_UPDATED',
      message: `Your appeal has been ${status ? `updated to ${status}` : 'commented on'}`,
      related_id: appeal.appeal_id,
      is_read: false
    });
  }

  return successResponse(res, 'Appeal updated successfully', updatedAppeal);
});

/**
 * @swagger
 * /api/up/appeals/{id}:
 *   delete:
 *     summary: Cancel/delete appeal (owner only, OPEN status)
 *     tags: [Appeals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Appeal deleted
 */
export const deleteAppeal = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: appeal, error: fetchError } = await supabase
    .from('appeals')
    .select('*')
    .eq('appeal_id', id)
    .single();

  if (fetchError || !appeal) return errorResponse(res, StatusCodes.NOT_FOUND, 'Appeal not found');

  if (appeal.person_id !== req.user.person_id) {
    return errorResponse(res, StatusCodes.FORBIDDEN, 'Only the appeal creator can delete it');
  }

  if (appeal.status !== 'OPEN') {
    return errorResponse(res, StatusCodes.BAD_REQUEST, 'Only OPEN appeals can be deleted');
  }

  await supabase.from('appeals').delete().eq('appeal_id', id);

  return successResponse(res, 'Appeal deleted successfully');
});
