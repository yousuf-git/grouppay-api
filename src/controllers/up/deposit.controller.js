import { supabase } from '../../database/database.js';
import { successResponse, errorResponse } from '../../services/utilities.service.js';
import { getPaginationRange, getPaginationMeta } from '../../services/pagination.service.js';
import asyncHandler from '../../services/asynchandler.js';
import { StatusCodes } from 'http-status-codes';

/**
 * @swagger
 * tags:
 *   name: Deposits
 *   description: Money transfers and settlements between members
 */

/**
 * @swagger
 * /api/up/deposits:
 *   get:
 *     summary: Get user's deposit requests
 *     tags: [Deposits]
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
 *         name: status
 *         schema: { type: string, enum: [PENDING, APPROVED, REJECTED] }
 *     responses:
 *       200:
 *         description: List of deposits
 */
/**
 * @swagger
 * /api/up/deposits/{id}:
 *   get:
 *     summary: Get single deposit request by ID
 *     tags: [Deposits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Deposit request details
 */
export const getDepositById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: deposit, error } = await supabase
    .from('deposit_requests')
    .select(`
      *,
      sender:sender_id(person_id, fullname, email, profile_picture_url),
      receiver:receiver_id(person_id, fullname, email, profile_picture_url),
      groups(group_id, name)
    `)
    .eq('request_id', id)
    .single();

  if (error || !deposit) return errorResponse(res, StatusCodes.NOT_FOUND, 'Deposit request not found');

  if (deposit.sender_id !== req.user.person_id && deposit.receiver_id !== req.user.person_id) {
    return errorResponse(res, StatusCodes.FORBIDDEN, 'Access denied');
  }

  return successResponse(res, 'Deposit request fetched', deposit);
});

export const getDeposits = asyncHandler(async (req, res) => {
  const { page, pageSize, groupId, status } = req.query;
  const { from, to, limit, page: pageNum } = getPaginationRange(page, pageSize);

  let query = supabase
    .from('deposit_requests')
    .select(`
      *,
      sender:sender_id(person_id, fullname, email, profile_picture_url),
      receiver:receiver_id(person_id, fullname, email, profile_picture_url),
      groups(group_id, name)
    `, { count: 'exact' })
    .or(`sender_id.eq.${req.user.person_id},receiver_id.eq.${req.user.person_id}`);

  if (groupId) query = query.eq('group_id', groupId);
  if (status) query = query.eq('status', status);

  const { data: deposits, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  return successResponse(res, 'Deposits fetched successfully', deposits, getPaginationMeta(count, pageNum, limit));
});

/**
 * @swagger
 * /api/up/deposits:
 *   post:
 *     summary: Create a deposit request
 *     tags: [Deposits]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [group_id, receiver_id, amount]
 *             properties:
 *               group_id: { type: integer }
 *               receiver_id: { type: integer }
 *               amount: { type: number }
 *               deposit_type: { type: string, enum: [CASH, BANK_TRANSFER, OTHER] }
 *               description: { type: string }
 *               attachment_url: { type: string }
 *     responses:
 *       201:
 *         description: Request sent
 */
export const createDeposit = asyncHandler(async (req, res) => {
  const { group_id, receiver_id, amount, deposit_type, description, attachment_url } = req.body;

  const { data: deposit, error } = await supabase
    .from('deposit_requests')
    .insert({
      group_id,
      sender_id: req.user.person_id,
      receiver_id,
      amount,
      deposit_type,
      description,
      attachment_url,
      status: 'PENDING'
    })
    .select()
    .single();

  if (error) throw error;

  await supabase.from('notifications').insert({
    receiver_id,
    sender_id: req.user.person_id,
    type: 'DEPOSIT_REQUEST',
    message: `${req.user.fullname} sent a deposit request of Rs ${amount}`,
    related_id: deposit.request_id,
    is_read: false
  });

  return successResponse(res, 'Deposit request sent successfully', deposit, null, StatusCodes.CREATED);
});

/**
 * @swagger
 * /api/up/deposits/{id}/status:
 *   patch:
 *     summary: Approve or Reject a deposit
 *     tags: [Deposits]
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
 *               status: { type: string, enum: [APPROVED, REJECTED] }
 *     responses:
 *       200:
 *         description: Status updated
 */
export const updateDepositStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const { data: deposit, error: fetchError } = await supabase
    .from('deposit_requests')
    .select('*')
    .eq('request_id', id)
    .single();

  if (fetchError || !deposit) return errorResponse(res, StatusCodes.NOT_FOUND, 'Deposit request not found');

  if (deposit.receiver_id !== req.user.person_id) {
    return errorResponse(res, StatusCodes.FORBIDDEN, 'Only the receiver can update status');
  }

  if (deposit.status !== 'PENDING') {
    return errorResponse(res, StatusCodes.BAD_REQUEST, 'Request already processed');
  }

  const { data: updatedDeposit, error: updateError } = await supabase
    .from('deposit_requests')
    .update({ status })
    .eq('request_id', id)
    .select()
    .single();

  if (updateError) throw updateError;

  if (status === 'APPROVED') {
    const { error: transError } = await supabase.from('transaction').insert([
      {
        person_id: deposit.sender_id,
        group_id: deposit.group_id,
        amount: deposit.amount,
        type: 'CREDIT',
        description: `Deposit Approved: Rs ${deposit.amount} (${deposit.deposit_type})`
      },
      {
        person_id: deposit.receiver_id,
        group_id: deposit.group_id,
        amount: deposit.amount,
        type: 'DEBIT',
        description: `Deposit Received: Rs ${deposit.amount} from member`
      }
    ]);

    if (transError) throw transError;
  }

  await supabase.from('notifications').insert({
    receiver_id: deposit.sender_id,
    sender_id: req.user.person_id,
    type: 'DEPOSIT_UPDATED',
    message: `Your deposit request of Rs ${deposit.amount} was ${status.toLowerCase()}`,
    related_id: deposit.request_id,
    is_read: false
  });

  return successResponse(res, `Deposit request ${status.toLowerCase()} successfully`, updatedDeposit);
});

/**
 * @swagger
 * /api/up/deposits/{id}:
 *   patch:
 *     summary: Update a PENDING deposit request (sender only)
 *     tags: [Deposits]
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
 *               amount: { type: number }
 *               deposit_type: { type: string, enum: [CASH, BANK_TRANSFER, OTHER] }
 *               description: { type: string }
 *               attachment_url: { type: string }
 *     responses:
 *       200:
 *         description: Deposit updated
 */
export const updateDeposit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const { data: deposit, error: fetchError } = await supabase
    .from('deposit_requests')
    .select('*')
    .eq('request_id', id)
    .single();

  if (fetchError || !deposit) return errorResponse(res, StatusCodes.NOT_FOUND, 'Deposit request not found');

  if (deposit.sender_id !== req.user.person_id) {
    return errorResponse(res, StatusCodes.FORBIDDEN, 'Only the sender can edit this request');
  }

  if (deposit.status !== 'PENDING') {
    return errorResponse(res, StatusCodes.BAD_REQUEST, 'Only PENDING requests can be edited');
  }

  const { data: updatedDeposit, error: updateError } = await supabase
    .from('deposit_requests')
    .update(updates)
    .eq('request_id', id)
    .select(`
      *,
      sender:sender_id(person_id, fullname, email, profile_picture_url),
      receiver:receiver_id(person_id, fullname, email, profile_picture_url),
      groups(group_id, name)
    `)
    .single();

  if (updateError) throw updateError;

  await supabase.from('notifications').insert({
    receiver_id: deposit.receiver_id,
    sender_id: req.user.person_id,
    type: 'DEPOSIT_REQUEST',
    message: `${req.user.fullname} updated a deposit request of Rs ${updatedDeposit.amount}`,
    related_id: deposit.request_id,
    is_read: false
  });

  return successResponse(res, 'Deposit request updated successfully', updatedDeposit);
});
