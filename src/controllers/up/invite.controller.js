import { supabase } from '../../database/database.js';
import { successResponse, errorResponse } from '../../services/utilities.service.js';
import { getPaginationRange, getPaginationMeta } from '../../services/pagination.service.js';
import asyncHandler from '../../services/asynchandler.js';
import { StatusCodes } from 'http-status-codes';

/**
 * @swagger
 * tags:
 *   name: Invites
 *   description: Group invitation system
 */

/**
 * @swagger
 * /api/up/invites/received:
 *   get:
 *     summary: Get received invites
 *     tags: [Invites]
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
 *         description: List of invites
 */
export const getReceivedInvites = asyncHandler(async (req, res) => {
  const { page, pageSize } = req.query;
  const { from, to, limit, page: pageNum } = getPaginationRange(page, pageSize);

  const { data: invites, error, count } = await supabase
    .from('group_invites')
    .select(`
      *,
      sender:sender_id(person_id, fullname, email),
      groups:group_id(group_id, name)
    `, { count: 'exact' })
    .eq('receiver_id', req.user.person_id)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  return successResponse(res, 'Invites fetched successfully', invites, getPaginationMeta(count, pageNum, limit));
});

/**
 * @swagger
 * /api/up/invites:
 *   post:
 *     summary: Send group invite
 *     tags: [Invites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [group_id, receiver_id]
 *             properties:
 *               group_id: { type: integer }
 *               receiver_id: { type: integer }
 *     responses:
 *       201:
 *         description: Invite sent
 */
export const sendInvite = asyncHandler(async (req, res) => {
  const { group_id, receiver_id } = req.body;

  const { data: existingPart } = await supabase
    .from('group_participants')
    .select('participant_id')
    .eq('group_id', group_id)
    .eq('person_id', receiver_id)
    .single();

  if (existingPart) return errorResponse(res, StatusCodes.BAD_REQUEST, 'User is already a member of this group');

  const { data: existingInvite } = await supabase
    .from('group_invites')
    .select('invite_id')
    .eq('group_id', group_id)
    .eq('receiver_id', receiver_id)
    .eq('status', 'PENDING')
    .single();

  if (existingInvite) return errorResponse(res, StatusCodes.BAD_REQUEST, 'A pending invite already exists');

  const { data: invite, error } = await supabase
    .from('group_invites')
    .insert({
      group_id,
      sender_id: req.user.person_id,
      receiver_id,
      status: 'PENDING'
    })
    .select()
    .single();

  if (error) throw error;

  const { data: group } = await supabase.from('groups').select('name').eq('group_id', group_id).single();
  await supabase.from('notifications').insert({
    receiver_id,
    sender_id: req.user.person_id,
    type: 'INVITE',
    message: `${req.user.fullname} invited you to join "${group?.name}"`,
    related_id: invite.invite_id,
    is_read: false
  });

  return successResponse(res, 'Invite sent successfully', invite, null, StatusCodes.CREATED);
});

/**
 * @swagger
 * /api/up/invites/{id}/status:
 *   patch:
 *     summary: Accept or Decline invite
 *     tags: [Invites]
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
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [ACCEPTED, DECLINED] }
 *     responses:
 *       200:
 *         description: Status updated
 */
/**
 * @swagger
 * /api/up/invites/sent:
 *   get:
 *     summary: Get sent invites
 *     tags: [Invites]
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
 *         description: List of sent invites
 */
export const getSentInvites = asyncHandler(async (req, res) => {
  const { page, pageSize } = req.query;
  const { from, to, limit, page: pageNum } = getPaginationRange(page, pageSize);

  const { data: invites, error, count } = await supabase
    .from('group_invites')
    .select(`
      *,
      receiver:receiver_id(person_id, fullname, email, profile_picture_url),
      groups:group_id(group_id, name)
    `, { count: 'exact' })
    .eq('sender_id', req.user.person_id)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  return successResponse(res, 'Sent invites fetched', invites, getPaginationMeta(count, pageNum, limit));
});

/**
 * @swagger
 * /api/up/invites/{id}:
 *   delete:
 *     summary: Cancel/delete a sent invite (PENDING only)
 *     tags: [Invites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Invite cancelled
 */
export const cancelInvite = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: invite, error: fetchError } = await supabase
    .from('group_invites')
    .select('*')
    .eq('invite_id', id)
    .single();

  if (fetchError || !invite) return errorResponse(res, StatusCodes.NOT_FOUND, 'Invite not found');

  if (invite.sender_id !== req.user.person_id) {
    return errorResponse(res, StatusCodes.FORBIDDEN, 'Only the sender can cancel an invite');
  }

  if (invite.status !== 'PENDING') {
    return errorResponse(res, StatusCodes.BAD_REQUEST, 'Only PENDING invites can be cancelled');
  }

  await supabase.from('group_invites').delete().eq('invite_id', id);

  return successResponse(res, 'Invite cancelled successfully');
});

export const updateInviteStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const { data: invite, error: fetchError } = await supabase
    .from('group_invites')
    .select('*')
    .eq('invite_id', id)
    .single();

  if (fetchError || !invite) return errorResponse(res, StatusCodes.NOT_FOUND, 'Invite not found');

  if (invite.receiver_id !== req.user.person_id) {
    return errorResponse(res, StatusCodes.FORBIDDEN, 'Access denied');
  }

  if (invite.status !== 'PENDING') {
    return errorResponse(res, StatusCodes.BAD_REQUEST, 'Invite already processed');
  }

  const { data: updatedInvite, error: updateError } = await supabase
    .from('group_invites')
    .update({ status })
    .eq('invite_id', id)
    .select()
    .single();

  if (updateError) throw updateError;

  if (status === 'ACCEPTED') {
    await supabase.from('group_participants').insert({
      person_id: req.user.person_id,
      group_id: invite.group_id,
      role: 'MEMBER',
      status: 'ACTIVE'
    });

    const { data: group } = await supabase.from('groups').select('name').eq('group_id', invite.group_id).single();
    await supabase.from('notifications').insert({
      receiver_id: invite.sender_id,
      sender_id: req.user.person_id,
      type: 'GROUP_UPDATE',
      message: `${req.user.fullname} accepted your invite to "${group?.name}"`,
      related_id: invite.group_id,
      is_read: false
    });
  }

  return successResponse(res, `Invite ${status.toLowerCase()} successfully`, updatedInvite);
});
