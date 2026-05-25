import { supabase } from '../../database/database.js';
import { successResponse, errorResponse } from '../../services/utilities.service.js';
import { getPaginationRange, getPaginationMeta } from '../../services/pagination.service.js';
import asyncHandler from '../../services/asynchandler.js';
import { StatusCodes } from 'http-status-codes';

/**
 * @swagger
 * tags:
 *   name: Expenses
 *   description: Personal expense tracking (independent of groups)
 */

/**
 * @swagger
 * /api/up/expenses:
 *   get:
 *     summary: Get current user's personal expenses
 *     tags: [Expenses]
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
 *         description: List of expenses
 */
export const getExpenses = asyncHandler(async (req, res) => {
  const { page, pageSize, type, startDate, endDate } = req.query;
  const { from, to, limit, page: pageNum } = getPaginationRange(page, pageSize);

  let query = supabase
    .from('expense')
    .select('*', { count: 'exact' })
    .eq('person_id', req.user.person_id);

  if (type) query = query.eq('type', type);
  if (startDate) query = query.gte('date_time', `${startDate}T00:00:00.000Z`);
  if (endDate) query = query.lte('date_time', `${endDate}T23:59:59.999Z`);

  const { data, error, count } = await query
    .order('date_time', { ascending: false })
    .range(from, to);

  if (error) throw error;

  return successResponse(res, 'Expenses fetched successfully', data, getPaginationMeta(count, pageNum, limit));
});

/**
 * @swagger
 * /api/up/expenses/stats:
 *   get:
 *     summary: Get personal expense stats (totals per type)
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Stats with totalCredit, totalDebit, netBalance
 */
export const getExpenseStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  let creditQuery = supabase.from('expense').select('amount').eq('person_id', req.user.person_id).eq('type', 'CREDIT');
  let debitQuery = supabase.from('expense').select('amount').eq('person_id', req.user.person_id).eq('type', 'DEBIT');

  if (startDate) {
    creditQuery = creditQuery.gte('date_time', `${startDate}T00:00:00.000Z`);
    debitQuery = debitQuery.gte('date_time', `${startDate}T00:00:00.000Z`);
  }
  if (endDate) {
    creditQuery = creditQuery.lte('date_time', `${endDate}T23:59:59.999Z`);
    debitQuery = debitQuery.lte('date_time', `${endDate}T23:59:59.999Z`);
  }

  const [creditResult, debitResult] = await Promise.all([creditQuery, debitQuery]);
  if (creditResult.error) throw creditResult.error;
  if (debitResult.error) throw debitResult.error;

  const totalCredit = creditResult.data?.reduce((sum, e) => sum + e.amount, 0) || 0;
  const totalDebit = debitResult.data?.reduce((sum, e) => sum + e.amount, 0) || 0;

  return successResponse(res, 'Expense stats fetched', {
    total_credit: totalCredit,
    total_debit: totalDebit,
    net_balance: totalCredit - totalDebit
  });
});

/**
 * @swagger
 * /api/up/expenses/{id}:
 *   get:
 *     summary: Get single expense by ID
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Expense details
 */
export const getExpenseById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('expense')
    .select('*')
    .eq('id', id)
    .eq('person_id', req.user.person_id)
    .single();

  if (error || !data) return errorResponse(res, StatusCodes.NOT_FOUND, 'Expense not found');

  return successResponse(res, 'Expense fetched', data);
});

/**
 * @swagger
 * /api/up/expenses:
 *   post:
 *     summary: Create a personal expense
 *     tags: [Expenses]
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
 *               location: { type: string }
 *               note: { type: string }
 *               date_time: { type: string, format: date-time }
 *               img_url: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: Expense created
 */
export const createExpense = asyncHandler(async (req, res) => {
  const { amount, type, location, note, date_time, img_url } = req.body;

  const { data, error } = await supabase
    .from('expense')
    .insert({
      person_id: req.user.person_id,
      amount,
      type,
      location: location || null,
      note: note || null,
      date_time: date_time || new Date().toISOString(),
      img_url: img_url || null
    })
    .select()
    .single();

  if (error) throw error;

  return successResponse(res, 'Expense created successfully', data);
});

/**
 * @swagger
 * /api/up/expenses/{id}:
 *   put:
 *     summary: Update a personal expense
 *     tags: [Expenses]
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
 *               location: { type: string }
 *               note: { type: string }
 *               date_time: { type: string, format: date-time }
 *               img_url: { type: array, items: { type: string } }
 *     responses:
 *       200:
 *         description: Expense updated
 */
export const updateExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const { data: existing } = await supabase
    .from('expense')
    .select('id')
    .eq('id', id)
    .eq('person_id', req.user.person_id)
    .single();

  if (!existing) return errorResponse(res, StatusCodes.NOT_FOUND, 'Expense not found');

  const { data, error } = await supabase
    .from('expense')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return successResponse(res, 'Expense updated successfully', data);
});

/**
 * @swagger
 * /api/up/expenses/{id}:
 *   delete:
 *     summary: Delete a personal expense
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Expense deleted
 */
export const deleteExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: existing } = await supabase
    .from('expense')
    .select('id')
    .eq('id', id)
    .eq('person_id', req.user.person_id)
    .single();

  if (!existing) return errorResponse(res, StatusCodes.NOT_FOUND, 'Expense not found');

  const { error } = await supabase.from('expense').delete().eq('id', id);
  if (error) throw error;

  return successResponse(res, 'Expense deleted successfully');
});
