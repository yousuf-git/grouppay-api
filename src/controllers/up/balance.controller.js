import { supabase } from '../../database/database.js';
import { successResponse, errorResponse } from '../../services/utilities.service.js';
import { getPaginationRange, getPaginationMeta } from '../../services/pagination.service.js';
import asyncHandler from '../../services/asynchandler.js';
import { StatusCodes } from 'http-status-codes';

/**
 * @swagger
 * tags:
 *   name: Balances
 *   description: Personal balance (cash-in-hand / personal ledger) tracking
 */

/**
 * @swagger
 * /api/up/balances:
 *   get:
 *     summary: Get current user's personal balance entries
 *     tags: [Balances]
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
 *         name: type
 *         schema: { type: string, enum: [CREDIT, DEBIT] }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: List of balance entries
 */
export const getBalances = asyncHandler(async (req, res) => {
  const { page, pageSize, type, startDate, endDate } = req.query;
  const { from, to, limit, page: pageNum } = getPaginationRange(page, pageSize);

  let query = supabase
    .from('balances')
    .select('*', { count: 'exact' })
    .eq('person_id', req.user.person_id);

  if (type) query = query.eq('type', type);
  if (startDate) query = query.gte('created_at', `${startDate}T00:00:00.000Z`);
  if (endDate) query = query.lte('created_at', `${endDate}T23:59:59.999Z`);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  return successResponse(res, 'Balances fetched successfully', data, getPaginationMeta(count, pageNum, limit));
});

/**
 * @swagger
 * /api/up/balances/stats:
 *   get:
 *     summary: Get personal balance stats
 *     tags: [Balances]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stats with totalCredit, totalDebit, netBalance
 */
export const getBalanceStats = asyncHandler(async (req, res) => {
  const [creditResult, debitResult] = await Promise.all([
    supabase.from('balances').select('amount').eq('person_id', req.user.person_id).eq('type', 'CREDIT'),
    supabase.from('balances').select('amount').eq('person_id', req.user.person_id).eq('type', 'DEBIT')
  ]);

  if (creditResult.error) throw creditResult.error;
  if (debitResult.error) throw debitResult.error;

  const totalCredit = creditResult.data?.reduce((sum, e) => sum + e.amount, 0) || 0;
  const totalDebit = debitResult.data?.reduce((sum, e) => sum + e.amount, 0) || 0;

  return successResponse(res, 'Balance stats fetched', {
    total_credit: totalCredit,
    total_debit: totalDebit,
    net_balance: totalCredit - totalDebit
  });
});

/**
 * @swagger
 * /api/up/balances/{id}:
 *   get:
 *     summary: Get single balance entry by ID
 *     tags: [Balances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Balance entry
 */
export const getBalanceById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('balances')
    .select('*')
    .eq('id', id)
    .eq('person_id', req.user.person_id)
    .single();

  if (error || !data) return errorResponse(res, StatusCodes.NOT_FOUND, 'Balance entry not found');

  return successResponse(res, 'Balance entry fetched', data);
});

/**
 * @swagger
 * /api/up/balances:
 *   post:
 *     summary: Create a personal balance entry
 *     tags: [Balances]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, type]
 *             properties:
 *               amount: { type: number }
 *               type: { type: string, enum: [CREDIT, DEBIT] }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Balance entry created
 */
export const createBalance = asyncHandler(async (req, res) => {
  const { amount, type, description } = req.body;

  const { data, error } = await supabase
    .from('balances')
    .insert({
      person_id: req.user.person_id,
      amount,
      type,
      description: description || null
    })
    .select()
    .single();

  if (error) throw error;

  return successResponse(res, 'Balance entry created successfully', data);
});

/**
 * @swagger
 * /api/up/balances/{id}:
 *   patch:
 *     summary: Update a personal balance entry
 *     tags: [Balances]
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
 *               type: { type: string, enum: [CREDIT, DEBIT] }
 *               description: { type: string }
 *     responses:
 *       200:
 *         description: Balance entry updated
 */
export const updateBalance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const { data: existing } = await supabase
    .from('balances')
    .select('id')
    .eq('id', id)
    .eq('person_id', req.user.person_id)
    .single();

  if (!existing) return errorResponse(res, StatusCodes.NOT_FOUND, 'Balance entry not found');

  const { data, error } = await supabase
    .from('balances')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return successResponse(res, 'Balance entry updated successfully', data);
});

/**
 * @swagger
 * /api/up/balances/{id}:
 *   delete:
 *     summary: Delete a personal balance entry
 *     tags: [Balances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Balance entry deleted
 */
export const deleteBalance = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: existing } = await supabase
    .from('balances')
    .select('id')
    .eq('id', id)
    .eq('person_id', req.user.person_id)
    .single();

  if (!existing) return errorResponse(res, StatusCodes.NOT_FOUND, 'Balance entry not found');

  const { error } = await supabase.from('balances').delete().eq('id', id);
  if (error) throw error;

  return successResponse(res, 'Balance entry deleted successfully');
});
