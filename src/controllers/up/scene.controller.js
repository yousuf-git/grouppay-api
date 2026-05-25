import { supabase } from '../../database/database.js';
import { successResponse, errorResponse } from '../../services/utilities.service.js';
import { getPaginationRange, getPaginationMeta } from '../../services/pagination.service.js';
import asyncHandler from '../../services/asynchandler.js';
import { StatusCodes } from 'http-status-codes';

/**
 * @swagger
 * tags:
 *   name: Scenes
 *   description: Spending events and automated split logic
 */

/**
 * @swagger
 * /api/up/scenes:
 *   get:
 *     summary: Get all scenes for current user
 *     tags: [Scenes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer }
 *       - in: query
 *         name: groupId
 *         schema: { type: integer }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: location
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of scenes
 */
export const getUserScenes = asyncHandler(async (req, res) => {
  const { page, pageSize, groupId, startDate, endDate, location } = req.query;
  const { from, to, limit, page: pageNum } = getPaginationRange(page, pageSize);

  const { data: userGroups } = await supabase
    .from('group_participants')
    .select('group_id')
    .eq('person_id', req.user.person_id)
    .eq('status', 'ACTIVE');

  if (!userGroups || userGroups.length === 0) {
    return successResponse(res, 'No scenes found', [], getPaginationMeta(0, pageNum, limit));
  }

  const groupIds = userGroups.map(g => g.group_id);

  let query = supabase
    .from('scene')
    .select(`
      *,
      groups(group_id, name),
      scene_participants(
        person_id,
        paid_amount,
        pending_amount,
        additional_amount,
        participant_category,
        person:person_id(person_id, fullname, email, profile_picture_url)
      )
    `, { count: 'exact' })
    .in('group_id', groupIds);

  if (groupId) query = query.eq('group_id', groupId);
  if (startDate) query = query.gte('scene_timestamptz', startDate);
  if (endDate) query = query.lte('scene_timestamptz', `${endDate}T23:59:59.999Z`);
  if (location) query = query.ilike('location', `%${location}%`);

  const { data: scenes, error, count } = await query
    .order('scene_timestamptz', { ascending: false })
    .range(from, to);

  if (error) throw error;

  return successResponse(res, 'Scenes fetched successfully', scenes, getPaginationMeta(count, pageNum, limit));
});

/**
 * @swagger
 * /api/up/scenes/{id}:
 *   get:
 *     summary: Get scene by ID
 *     tags: [Scenes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Scene details
 */
export const getSceneById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: scene, error } = await supabase
    .from('scene')
    .select(`
      *,
      groups(group_id, name, created_by),
      transaction(*),
      scene_participants(
        person_id,
        paid_amount,
        pending_amount,
        additional_amount,
        participant_category,
        person(person_id, fullname, email, profile_picture_url)
      )
    `)
    .eq('scene_id', id)
    .single();

  if (error || !scene) {
    return errorResponse(res, StatusCodes.NOT_FOUND, 'Scene not found');
  }

  const { data: participant } = await supabase
    .from('group_participants')
    .select('participant_id')
    .eq('group_id', scene.group_id)
    .eq('person_id', req.user.person_id)
    .eq('status', 'ACTIVE')
    .single();

  if (!participant) {
    return errorResponse(res, StatusCodes.FORBIDDEN, 'Access denied');
  }

  return successResponse(res, 'Scene details fetched', scene);
});

/**
 * @swagger
 * /api/up/scenes:
 *   post:
 *     summary: Create a scene with ledger transactions
 *     description: |
 *       Creates a spending event (Scene). 
 *       - **Pre-condition**: Requester must be an ADMIN of the group.
 *       - **Splitting Logic**: 
 *         - `SHARING`: Split the base bill (Total - Sum of Additionals) among all participants.
 *         - `INDIVIDUAL`: Does not take a share of the base bill; only responsible for their `additional_amount`.
 *       - **Ledger**: Automatically creates CREDIT/DEBIT transactions based on (Share + Additional) vs Paid.
 *     tags: [Scenes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [group_id, location, scene_timestamptz, total_amount, participants]
 *             properties:
 *               group_id: { type: integer }
 *               location: { type: string }
 *               description: { type: string }
 *               scene_timestamptz: { type: string, format: date-time }
 *               total_amount: { type: number }
 *               image_url: { type: string }
 *               participants:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [person_id, paid_amount, additional_amount]
 *                   properties:
 *                     person_id: { type: integer }
 *                     paid_amount: { type: number }
 *                     additional_amount: { type: number }
 *                     participant_category: { type: string, enum: [SHARING, INDIVIDUAL] }
 *     responses:
 *       201:
 *         description: Scene created successfully
 */
export const createScene = asyncHandler(async (req, res) => {
  const { group_id, location, description, scene_timestamptz, total_amount, image_url, participants } = req.body;

  const { data: requesterPart } = await supabase
    .from('group_participants')
    .select('role')
    .eq('group_id', group_id)
    .eq('person_id', req.user.person_id)
    .single();

  if (!requesterPart || requesterPart.role !== 'ADMIN') {
    return errorResponse(res, StatusCodes.FORBIDDEN, 'Only group admins can create scenes');
  }

  const totalPaid = participants.reduce((sum, p) => sum + p.paid_amount, 0);
  if (Math.abs(totalPaid - total_amount) > 0.01) {
    return errorResponse(res, StatusCodes.BAD_REQUEST, 'Total paid amount must equal total bill amount');
  }

  const sharingParticipants = participants.filter(p => p.participant_category !== 'INDIVIDUAL');
  const individualParticipants = participants.filter(p => p.participant_category === 'INDIVIDUAL');

  const totalIndividualItems = individualParticipants.reduce((sum, p) => sum + p.additional_amount, 0);
  const totalSharingAdditional = sharingParticipants.reduce((sum, p) => sum + p.additional_amount, 0);
  
  const shareableBase = total_amount - totalIndividualItems - totalSharingAdditional;
  const perPersonBaseShare = sharingParticipants.length > 0 ? shareableBase / sharingParticipants.length : 0;

  const { data: scene, error: sceneError } = await supabase
    .from('scene')
    .insert({ group_id, location, description, scene_timestamptz, total_amount, image_url })
    .select()
    .single();

  if (sceneError) throw sceneError;

  try {
    const sceneParticipants = [];
    const transactions = [];

    participants.forEach(p => {
      const isIndividual = p.participant_category === 'INDIVIDUAL';
      const share = isIndividual ? 0 : perPersonBaseShare;
      const totalResponsibility = share + p.additional_amount;
      const netAmount = totalResponsibility - p.paid_amount;

      sceneParticipants.push({
        scene_id: scene.scene_id,
        person_id: p.person_id,
        paid_amount: p.paid_amount,
        additional_amount: p.additional_amount,
        pending_amount: netAmount > 0 ? netAmount : 0,
        participant_category: p.participant_category || 'SHARING',
      });

      if (Math.abs(netAmount) > 0.01) {
        if (netAmount > 0) {
          transactions.push({
            person_id: p.person_id,
            group_id,
            scene_id: scene.scene_id,
            amount: netAmount,
            type: 'DEBIT',
            description: isIndividual 
              ? `Scene at ${location} (Individual Bill: Rs ${totalResponsibility.toFixed(2)})`
              : `Scene at ${location} (Share: Rs ${share.toFixed(2)}${p.additional_amount > 0 ? ` + Additional: Rs ${p.additional_amount.toFixed(2)}` : ''})`
          });
        } else {
          transactions.push({
            person_id: p.person_id,
            group_id,
            scene_id: scene.scene_id,
            amount: Math.abs(netAmount),
            type: 'CREDIT',
            description: `Scene at ${location} (Extra paid: Rs ${Math.abs(netAmount).toFixed(2)})`
          });
        }
      }
    });

    const { error: partError } = await supabase.from('scene_participants').insert(sceneParticipants);
    if (partError) throw partError;

    if (transactions.length > 0) {
      const { error: transError } = await supabase.from('transaction').insert(transactions);
      if (transError) throw transError;
    }

    const { data: group } = await supabase.from('groups').select('name').eq('group_id', group_id).single();
    const notifications = participants.map(p => ({
      receiver_id: p.person_id,
      sender_id: req.user.person_id,
      type: 'SCENE_CREATED',
      message: `New scene at "${location}" in "${group?.name}" (Total: Rs ${total_amount})`,
      related_id: scene.scene_id,
      is_read: false,
    }));
    await supabase.from('notifications').insert(notifications);

    return successResponse(res, 'Scene created successfully', scene, null, StatusCodes.CREATED);

  } catch (err) {
    await supabase.from('scene').delete().eq('scene_id', scene.scene_id);
    throw err;
  }
});

/**
 * @swagger
 * /api/up/scenes/{id}:
 *   delete:
 *     summary: Delete scene
 *     tags: [Scenes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Scene deleted successfully
 */
export const deleteScene = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: scene } = await supabase.from('scene').select('group_id, location').eq('scene_id', id).single();
  if (!scene) return errorResponse(res, StatusCodes.NOT_FOUND, 'Scene not found');

  const { data: participant } = await supabase
    .from('group_participants')
    .select('role')
    .eq('group_id', scene.group_id)
    .eq('person_id', req.user.person_id)
    .single();

  if (!participant || participant.role !== 'ADMIN') {
    return errorResponse(res, StatusCodes.FORBIDDEN, 'Only admins can delete scenes');
  }

  const { error } = await supabase.from('scene').delete().eq('scene_id', id);
  if (error) throw error;

  const { data: activeMembers } = await supabase
    .from('group_participants')
    .select('person_id')
    .eq('group_id', scene.group_id)
    .eq('status', 'ACTIVE');

  if (activeMembers && activeMembers.length > 0) {
    const notifications = activeMembers.map(m => ({
      receiver_id: m.person_id,
      sender_id: req.user.person_id,
      type: 'SCENE_DELETED',
      message: `Scene at "${scene.location}" was deleted`,
      related_id: scene.group_id,
      is_read: false
    }));
    await supabase.from('notifications').insert(notifications);
  }

  return successResponse(res, 'Scene deleted successfully');
});

/**
 * @swagger
 * /api/up/scenes/{id}:
 *   put:
 *     summary: Update scene (full wipe-and-recreate of participants and transactions)
 *     tags: [Scenes]
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
 *               location: { type: string }
 *               description: { type: string }
 *               scene_timestamptz: { type: string, format: date-time }
 *               total_amount: { type: number }
 *               image_url: { type: string }
 *               participants:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [person_id, paid_amount, additional_amount]
 *                   properties:
 *                     person_id: { type: integer }
 *                     paid_amount: { type: number }
 *                     additional_amount: { type: number }
 *                     participant_category: { type: string, enum: [SHARING, INDIVIDUAL] }
 *     responses:
 *       200:
 *         description: Scene updated
 */
export const updateScene = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { location, description, scene_timestamptz, total_amount, image_url, participants } = req.body;

  const { data: scene } = await supabase.from('scene').select('*').eq('scene_id', id).single();
  if (!scene) return errorResponse(res, StatusCodes.NOT_FOUND, 'Scene not found');

  const { data: requesterPart } = await supabase
    .from('group_participants')
    .select('role')
    .eq('group_id', scene.group_id)
    .eq('person_id', req.user.person_id)
    .single();

  if (!requesterPart || requesterPart.role !== 'ADMIN') {
    return errorResponse(res, StatusCodes.FORBIDDEN, 'Only group admins can update scenes');
  }

  const newTotal = total_amount ?? scene.total_amount;
  const newParticipants = participants ?? [];

  if (newParticipants.length > 0) {
    const totalPaid = newParticipants.reduce((sum, p) => sum + p.paid_amount, 0);
    if (Math.abs(totalPaid - newTotal) > 0.01) {
      return errorResponse(res, StatusCodes.BAD_REQUEST, 'Total paid amount must equal total bill amount');
    }
  }

  const sceneUpdates = {};
  if (location !== undefined) sceneUpdates.location = location;
  if (description !== undefined) sceneUpdates.description = description;
  if (scene_timestamptz !== undefined) sceneUpdates.scene_timestamptz = scene_timestamptz;
  if (total_amount !== undefined) sceneUpdates.total_amount = total_amount;
  if (image_url !== undefined) sceneUpdates.image_url = image_url;

  const { data: updatedScene, error: updateError } = await supabase
    .from('scene')
    .update(sceneUpdates)
    .eq('scene_id', id)
    .select()
    .single();

  if (updateError) throw updateError;

  if (newParticipants.length > 0) {
    await supabase.from('scene_participants').delete().eq('scene_id', id);
    await supabase.from('transaction').delete().eq('scene_id', id);

    const sharingParticipants = newParticipants.filter(p => p.participant_category !== 'INDIVIDUAL');
    const individualParticipants = newParticipants.filter(p => p.participant_category === 'INDIVIDUAL');

    const totalIndividualItems = individualParticipants.reduce((sum, p) => sum + p.additional_amount, 0);
    const totalSharingAdditional = sharingParticipants.reduce((sum, p) => sum + p.additional_amount, 0);
    const shareableBase = newTotal - totalIndividualItems - totalSharingAdditional;
    const perPersonBaseShare = sharingParticipants.length > 0 ? shareableBase / sharingParticipants.length : 0;

    const sceneParticipants = [];
    const transactions = [];
    const effectiveLocation = location ?? scene.location;

    newParticipants.forEach(p => {
      const isIndividual = p.participant_category === 'INDIVIDUAL';
      const share = isIndividual ? 0 : perPersonBaseShare;
      const totalResponsibility = share + p.additional_amount;
      const netAmount = totalResponsibility - p.paid_amount;

      sceneParticipants.push({
        scene_id: Number(id),
        person_id: p.person_id,
        paid_amount: p.paid_amount,
        additional_amount: p.additional_amount,
        pending_amount: netAmount > 0 ? netAmount : 0,
        participant_category: p.participant_category || 'SHARING'
      });

      if (Math.abs(netAmount) > 0.01) {
        if (netAmount > 0) {
          transactions.push({
            person_id: p.person_id,
            group_id: scene.group_id,
            scene_id: Number(id),
            amount: netAmount,
            type: 'DEBIT',
            description: isIndividual
              ? `Scene at ${effectiveLocation} (Individual Bill: Rs ${totalResponsibility.toFixed(2)})`
              : `Scene at ${effectiveLocation} (Share: Rs ${share.toFixed(2)}${p.additional_amount > 0 ? ` + Additional: Rs ${p.additional_amount.toFixed(2)}` : ''})`
          });
        } else {
          transactions.push({
            person_id: p.person_id,
            group_id: scene.group_id,
            scene_id: Number(id),
            amount: Math.abs(netAmount),
            type: 'CREDIT',
            description: `Scene at ${effectiveLocation} (Extra paid: Rs ${Math.abs(netAmount).toFixed(2)})`
          });
        }
      }
    });

    const { error: partError } = await supabase.from('scene_participants').insert(sceneParticipants);
    if (partError) throw partError;

    if (transactions.length > 0) {
      const { error: transError } = await supabase.from('transaction').insert(transactions);
      if (transError) throw transError;
    }

    const { data: activeMembers } = await supabase
      .from('group_participants')
      .select('person_id')
      .eq('group_id', scene.group_id)
      .eq('status', 'ACTIVE');

    if (activeMembers && activeMembers.length > 0) {
      const { data: group } = await supabase.from('groups').select('name').eq('group_id', scene.group_id).single();
      const notifications = activeMembers.map(m => ({
        receiver_id: m.person_id,
        sender_id: req.user.person_id,
        type: 'SCENE_UPDATED',
        message: `Scene at "${effectiveLocation}" in "${group?.name}" was updated`,
        related_id: Number(id),
        is_read: false
      }));
      await supabase.from('notifications').insert(notifications);
    }
  }

  return successResponse(res, 'Scene updated successfully', updatedScene);
});

/**
 * @swagger
 * /api/up/scenes/calculate:
 *   post:
 *     summary: Preview split calculation without saving
 *     tags: [Scenes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [total_amount, participants]
 *             properties:
 *               total_amount: { type: number }
 *               participants:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [person_id, paid_amount, additional_amount]
 *                   properties:
 *                     person_id: { type: integer }
 *                     paid_amount: { type: number }
 *                     additional_amount: { type: number }
 *                     participant_category: { type: string, enum: [SHARING, INDIVIDUAL] }
 *     responses:
 *       200:
 *         description: Calculated split breakdown
 */
export const calculateScene = asyncHandler(async (req, res) => {
  const { total_amount, participants } = req.body;

  const sharingParticipants = participants.filter(p => p.participant_category !== 'INDIVIDUAL');
  const individualParticipants = participants.filter(p => p.participant_category === 'INDIVIDUAL');

  const totalIndividualItems = individualParticipants.reduce((sum, p) => sum + p.additional_amount, 0);
  const totalSharingAdditional = sharingParticipants.reduce((sum, p) => sum + p.additional_amount, 0);
  const shareableAmount = total_amount - totalIndividualItems - totalSharingAdditional;
  const perPersonShare = sharingParticipants.length > 0 ? shareableAmount / sharingParticipants.length : 0;

  const totalPaid = participants.reduce((sum, p) => sum + p.paid_amount, 0);
  const valid = Math.abs(totalPaid - total_amount) <= 0.01;

  const result = participants.map(p => {
    const isIndividual = p.participant_category === 'INDIVIDUAL';
    const share = isIndividual ? 0 : perPersonShare;
    const totalResponsibility = share + p.additional_amount;
    const netAmount = totalResponsibility - p.paid_amount;

    return {
      person_id: p.person_id,
      share,
      additional_amount: p.additional_amount,
      total_responsibility: totalResponsibility,
      paid_amount: p.paid_amount,
      net_amount: netAmount,
      type: netAmount > 0.01 ? 'DEBIT' : netAmount < -0.01 ? 'CREDIT' : 'SETTLED'
    };
  });

  return successResponse(res, 'Calculation complete', {
    total_amount,
    shareable_amount: shareableAmount,
    per_person_share: perPersonShare,
    valid,
    participants: result
  });
});
