import { supabase } from '../../database/database.js';
import { successResponse, errorResponse } from '../../services/utilities.service.js';
import { getPaginationRange, getPaginationMeta } from '../../services/pagination.service.js';
import asyncHandler from '../../services/asynchandler.js';
import { StatusCodes } from 'http-status-codes';

/**
 * @swagger
 * tags:
 *   name: Groups
 *   description: Group management and membership
 */

/**
 * @swagger
 * /api/up/groups:
 *   get:
 *     summary: Get all groups for current user
 *     tags: [Groups]
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
 *         description: List of groups
 */
export const getUserGroups = asyncHandler(async (req, res) => {
  const { page, pageSize } = req.query;
  const { from, to, limit, page: pageNum } = getPaginationRange(page, pageSize);

  const { data: participantData, error: participantError, count } = await supabase
    .from('group_participants')
    .select('group_id', { count: 'exact' })
    .eq('person_id', req.user.person_id)
    .eq('status', 'ACTIVE')
    .range(from, to);

  if (participantError) throw participantError;

  if (!participantData || participantData.length === 0) {
    return successResponse(res, 'No groups found', [], getPaginationMeta(0, pageNum, limit));
  }

  const groupIds = participantData.map(p => p.group_id);

  const { data: groups, error: groupsError } = await supabase
    .from('groups')
    .select(`
      group_id,
      name,
      status,
      created_by,
      is_active,
      created_at,
      group_participants(
        participant_id,
        person_id,
        role,
        status,
        joined_at,
        person:person_id(person_id, email, fullname, phone, username, profile_picture_url)
      )
    `)
    .in('group_id', groupIds)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (groupsError) throw groupsError;

  const { data: starredData } = await supabase
    .from('starred_groups')
    .select('group_id')
    .eq('person_id', req.user.person_id)
    .in('group_id', groupIds);

  const starredGroupIds = new Set(starredData?.map(s => s.group_id) || []);

  const data = groups.map(group => ({
    ...group,
    is_starred: starredGroupIds.has(group.group_id)
  }));

  return successResponse(res, 'Groups fetched successfully', data, getPaginationMeta(count, pageNum, limit));
});

/**
 * @swagger
 * /api/up/groups/{id}:
 *   get:
 *     summary: Get group by ID
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Group details
 */
export const getGroupById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: group, error } = await supabase
    .from('groups')
    .select(`
      *,
      group_participants(
        participant_id,
        person_id,
        role,
        status,
        joined_at,
        person:person_id(person_id, email, fullname, phone, username, profile_picture_url)
      )
    `)
    .eq('group_id', id)
    .single();

  if (error || !group) {
    return errorResponse(res, StatusCodes.NOT_FOUND, 'Group not found');
  }

  const isParticipant = group.group_participants.some(p => p.person_id === req.user.person_id);
  if (!isParticipant) {
    return errorResponse(res, StatusCodes.FORBIDDEN, 'Access denied');
  }

  return successResponse(res, 'Group details fetched', group);
});

/**
 * @swagger
 * /api/up/groups:
 *   post:
 *     summary: Create a new group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *     responses:
 *       201:
 *         description: Group created
 */
export const createGroup = asyncHandler(async (req, res) => {
  const { name } = req.body;

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({ name, created_by: req.user.person_id })
    .select()
    .single();

  if (groupError) throw groupError;

  const { error: participantError } = await supabase
    .from('group_participants')
    .insert({
      person_id: req.user.person_id,
      group_id: group.group_id,
      role: 'ADMIN',
      status: 'ACTIVE'
    });

  if (participantError) {
    await supabase.from('groups').delete().eq('group_id', group.group_id);
    throw participantError;
  }

  return successResponse(res, 'Group created successfully', group, null, StatusCodes.CREATED);
});

/**
 * @swagger
 * /api/up/groups/{id}:
 *   patch:
 *     summary: Update group
 *     tags: [Groups]
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
 *               name: { type: string }
 *               is_active: { type: boolean }
 *     responses:
 *       200:
 *         description: Group updated
 */
export const updateGroup = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const { data: participant } = await supabase
    .from('group_participants')
    .select('role')
    .eq('group_id', id)
    .eq('person_id', req.user.person_id)
    .single();

  if (!participant || participant.role !== 'ADMIN') {
    return errorResponse(res, StatusCodes.FORBIDDEN, 'Only admins can update group');
  }

  const { data: group, error } = await supabase
    .from('groups')
    .update(updates)
    .eq('group_id', id)
    .select()
    .single();

  if (error) throw error;

  return successResponse(res, 'Group updated successfully', group);
});

/**
 * @swagger
 * /api/up/groups/{id}/star:
 *   post:
 *     summary: Toggle group star status
 *     tags: [Groups]
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
 *             required: [starred]
 *             properties:
 *               starred: { type: boolean }
 *     responses:
 *       200:
 *         description: Status updated
 */
export const toggleStarGroup = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { starred } = req.body;

  if (starred) {
    await supabase
      .from('starred_groups')
      .upsert({ person_id: req.user.person_id, group_id: id });
  } else {
    await supabase
      .from('starred_groups')
      .delete()
      .eq('person_id', req.user.person_id)
      .eq('group_id', id);
  }

  return successResponse(res, `Group ${starred ? 'starred' : 'unstarred'} successfully`);
});

/**
 * @swagger
 * /api/up/groups/{id}/leave:
 *   delete:
 *     summary: Leave group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Left group successfully
 */
export const leaveGroup = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: transactions } = await supabase
    .from('transaction')
    .select('type, amount')
    .eq('group_id', id)
    .eq('person_id', req.user.person_id);

  let balance = 0;
  transactions?.forEach(t => {
    if (t.type === 'CREDIT') balance += t.amount;
    else balance -= t.amount;
  });

  if (Math.abs(balance) > 0.01) {
    return errorResponse(res, StatusCodes.BAD_REQUEST, `Cannot leave with non-zero balance (PKR ${balance.toFixed(2)})`);
  }

  await supabase
    .from('group_participants')
    .delete()
    .eq('group_id', id)
    .eq('person_id', req.user.person_id);

  return successResponse(res, 'Left group successfully');
});

/**
 * @swagger
 * /api/up/groups/{id}:
 *   delete:
 *     summary: Soft-delete (deactivate) group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Group deactivated
 */
export const deleteGroup = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: participant } = await supabase
    .from('group_participants')
    .select('role')
    .eq('group_id', id)
    .eq('person_id', req.user.person_id)
    .single();

  if (!participant || participant.role !== 'ADMIN') {
    return errorResponse(res, StatusCodes.FORBIDDEN, 'Only admins can delete the group');
  }

  const { error } = await supabase
    .from('groups')
    .update({ is_active: false, status: 'INACTIVE' })
    .eq('group_id', id);

  if (error) throw error;

  return successResponse(res, 'Group deactivated successfully');
});

/**
 * @swagger
 * /api/up/groups/{id}/members:
 *   get:
 *     summary: Get group members
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: List of active members with roles
 */
export const getGroupMembers = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: self } = await supabase
    .from('group_participants')
    .select('participant_id')
    .eq('group_id', id)
    .eq('person_id', req.user.person_id)
    .eq('status', 'ACTIVE')
    .single();

  if (!self) return errorResponse(res, StatusCodes.FORBIDDEN, 'Access denied');

  const { data, error } = await supabase
    .from('group_participants')
    .select(`
      participant_id,
      person_id,
      role,
      status,
      joined_at,
      person:person_id(person_id, fullname, email, username, profile_picture_url)
    `)
    .eq('group_id', id)
    .eq('status', 'ACTIVE')
    .order('joined_at', { ascending: true });

  if (error) throw error;

  return successResponse(res, 'Members fetched successfully', data);
});

/**
 * @swagger
 * /api/up/groups/{id}/members/{personId}/role:
 *   patch:
 *     summary: Change member role (ADMIN only)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: personId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [ADMIN, MEMBER] }
 *     responses:
 *       200:
 *         description: Role updated
 */
export const updateMemberRole = asyncHandler(async (req, res) => {
  const { id, personId } = req.params;
  const { role } = req.body;

  const { data: requester } = await supabase
    .from('group_participants')
    .select('role')
    .eq('group_id', id)
    .eq('person_id', req.user.person_id)
    .single();

  if (!requester || requester.role !== 'ADMIN') {
    return errorResponse(res, StatusCodes.FORBIDDEN, 'Only admins can change member roles');
  }

  if (Number(personId) === req.user.person_id) {
    return errorResponse(res, StatusCodes.BAD_REQUEST, 'Cannot change your own role');
  }

  const { data, error } = await supabase
    .from('group_participants')
    .update({ role })
    .eq('group_id', id)
    .eq('person_id', personId)
    .select()
    .single();

  if (error || !data) return errorResponse(res, StatusCodes.NOT_FOUND, 'Member not found in this group');

  return successResponse(res, 'Member role updated successfully', data);
});

/**
 * @swagger
 * /api/up/groups/{id}/members/{personId}:
 *   delete:
 *     summary: Remove member from group (ADMIN only)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: personId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Member removed
 */
export const removeMember = asyncHandler(async (req, res) => {
  const { id, personId } = req.params;

  const { data: requester } = await supabase
    .from('group_participants')
    .select('role')
    .eq('group_id', id)
    .eq('person_id', req.user.person_id)
    .single();

  if (!requester || requester.role !== 'ADMIN') {
    return errorResponse(res, StatusCodes.FORBIDDEN, 'Only admins can remove members');
  }

  if (Number(personId) === req.user.person_id) {
    return errorResponse(res, StatusCodes.BAD_REQUEST, 'Use /leave to remove yourself');
  }

  const { data: transactions } = await supabase
    .from('transaction')
    .select('type, amount')
    .eq('group_id', id)
    .eq('person_id', personId);

  let balance = 0;
  transactions?.forEach(t => {
    if (t.type === 'CREDIT') balance += t.amount;
    else balance -= t.amount;
  });

  if (Math.abs(balance) > 0.01) {
    return errorResponse(res, StatusCodes.BAD_REQUEST, `Cannot remove member with non-zero balance (PKR ${balance.toFixed(2)})`);
  }

  const { error } = await supabase
    .from('group_participants')
    .delete()
    .eq('group_id', id)
    .eq('person_id', personId);

  if (error) throw error;

  const { data: group } = await supabase.from('groups').select('name').eq('group_id', id).single();
  await supabase.from('notifications').insert({
    receiver_id: Number(personId),
    sender_id: req.user.person_id,
    type: 'GROUP_UPDATE',
    message: `You have been removed from the group "${group?.name}"`,
    related_id: Number(id),
    is_read: false
  });

  return successResponse(res, 'Member removed successfully');
});

/**
 * @swagger
 * /api/up/groups/{id}/my-balance:
 *   get:
 *     summary: Get current user's net balance in a group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Net balance (positive = owed to you, negative = you owe)
 */
export const getMyGroupBalance = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: participant } = await supabase
    .from('group_participants')
    .select('participant_id')
    .eq('group_id', id)
    .eq('person_id', req.user.person_id)
    .single();

  if (!participant) return errorResponse(res, StatusCodes.FORBIDDEN, 'Not a member of this group');

  const { data: transactions, error } = await supabase
    .from('transaction')
    .select('type, amount')
    .eq('group_id', id)
    .eq('person_id', req.user.person_id);

  if (error) throw error;

  let credit = 0;
  let debit = 0;
  transactions?.forEach(t => {
    if (t.type === 'CREDIT') credit += t.amount;
    else debit += t.amount;
  });

  return successResponse(res, 'Balance fetched', {
    group_id: Number(id),
    credit,
    debit,
    net_balance: credit - debit
  });
});
