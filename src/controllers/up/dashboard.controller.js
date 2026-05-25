import { supabase } from '../../database/database.js';
import { successResponse } from '../../services/utilities.service.js';
import asyncHandler from '../../services/asynchandler.js';

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Aggregated summary for home screen
 */

/**
 * @swagger
 * /api/up/dashboard:
 *   get:
 *     summary: Get dashboard summary for the current user
 *     description: |
 *       Returns aggregated data useful for a mobile home screen:
 *       - Group count and per-group balance
 *       - Pending deposit requests count
 *       - Unread notification count
 *       - Pending received invites count
 *       - Personal balance net total
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard summary
 */
export const getDashboard = asyncHandler(async (req, res) => {
  const personId = req.user.person_id;

  const [
    groupsResult,
    notificationsResult,
    invitesResult,
    depositsResult,
    transactionsResult,
    balanceResult
  ] = await Promise.all([
    supabase
      .from('group_participants')
      .select('group_id, groups(group_id, name)', { count: 'exact' })
      .eq('person_id', personId)
      .eq('status', 'ACTIVE'),
    supabase
      .from('notifications')
      .select('notification_id', { count: 'exact' })
      .eq('receiver_id', personId)
      .eq('is_read', false),
    supabase
      .from('group_invites')
      .select('invite_id', { count: 'exact' })
      .eq('receiver_id', personId)
      .eq('status', 'PENDING'),
    supabase
      .from('deposit_requests')
      .select('request_id', { count: 'exact' })
      .eq('receiver_id', personId)
      .eq('status', 'PENDING'),
    supabase
      .from('transaction')
      .select('group_id, type, amount')
      .eq('person_id', personId),
    supabase
      .from('balances')
      .select('type, amount')
      .eq('person_id', personId)
  ]);

  const groupIds = groupsResult.data?.map(g => g.group_id) || [];

  const groupBalanceMap = {};
  transactionsResult.data?.forEach(tx => {
    if (!groupBalanceMap[tx.group_id]) {
      groupBalanceMap[tx.group_id] = { credit: 0, debit: 0 };
    }
    if (tx.type === 'CREDIT') groupBalanceMap[tx.group_id].credit += tx.amount;
    else groupBalanceMap[tx.group_id].debit += tx.amount;
  });

  const groupBalances = groupsResult.data?.map(g => {
    const b = groupBalanceMap[g.group_id] || { credit: 0, debit: 0 };
    return {
      group_id: g.group_id,
      group_name: g.groups?.name,
      credit: b.credit,
      debit: b.debit,
      net_balance: b.credit - b.debit
    };
  }) || [];

  const totalGroupCredit = groupBalances.reduce((s, g) => s + g.credit, 0);
  const totalGroupDebit = groupBalances.reduce((s, g) => s + g.debit, 0);

  let personalBalanceCredit = 0;
  let personalBalanceDebit = 0;
  balanceResult.data?.forEach(b => {
    if (b.type === 'CREDIT') personalBalanceCredit += b.amount;
    else personalBalanceDebit += b.amount;
  });

  return successResponse(res, 'Dashboard data fetched', {
    groups: {
      count: groupsResult.count || 0,
      total_credit: totalGroupCredit,
      total_debit: totalGroupDebit,
      net_balance: totalGroupCredit - totalGroupDebit,
      breakdown: groupBalances
    },
    personal_balance: {
      total_credit: personalBalanceCredit,
      total_debit: personalBalanceDebit,
      net_balance: personalBalanceCredit - personalBalanceDebit
    },
    pending_invites: invitesResult.count || 0,
    pending_deposits: depositsResult.count || 0,
    unread_notifications: notificationsResult.count || 0
  });
});
