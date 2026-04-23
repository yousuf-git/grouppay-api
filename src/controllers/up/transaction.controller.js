import { supabase } from '../../database/database.js';
import { successResponse, errorResponse } from '../../services/utilities.service.js';
import { getPaginationRange, getPaginationMeta } from '../../services/pagination.service.js';
import asyncHandler from '../../services/asynchandler.js';
import { StatusCodes } from 'http-status-codes';

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Group ledger and financial summary
 */

/**
 * @swagger
 * /api/up/transactions:
 *   get:
 *     summary: Get transactions (ledger)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: groupId
 *         schema: { type: integer }
 *       - in: query
 *         name: personId
 *         schema: { type: integer }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: List of transactions
 */
export const getTransactions = asyncHandler(async (req, res) => {
  const { page, pageSize, groupId, personId, startDate, endDate } = req.query;
  const { from, to, limit, page: pageNum } = getPaginationRange(page, pageSize);

  let query = supabase
    .from('transaction')
    .select(`
      *,
      person(person_id, fullname, email, profile_picture_url),
      scene(scene_id, location, description)
    `, { count: 'exact' });

  if (groupId) query = query.eq('group_id', groupId);
  if (personId) query = query.eq('person_id', personId);
  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', `${endDate}T23:59:59.999Z`);

  const { data: transactions, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  return successResponse(res, 'Transactions fetched successfully', transactions, getPaginationMeta(count, pageNum, limit));
});

/**
 * @swagger
 * /api/up/transactions/summary/{groupId}:
 *   get:
 *     summary: Get group financial summary
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Financial summary (who owes what)
 */
export const getGroupSummary = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  const { data: transactions, error } = await supabase
    .from('transaction')
    .select('person_id, type, amount')
    .eq('group_id', groupId);

  if (error) throw error;

  const summary = {};

  transactions.forEach(t => {
    if (!summary[t.person_id]) {
      summary[t.person_id] = 0;
    }
    if (t.type === 'CREDIT') {
      summary[t.person_id] += t.amount;
    } else {
      summary[t.person_id] -= t.amount;
    }
  });

  return successResponse(res, 'Group summary fetched', summary);
});
