import { supabase } from '../../database/database.js';
import { successResponse, errorResponse } from '../../services/utilities.service.js';
import asyncHandler from '../../services/asynchandler.js';
import { StatusCodes } from 'http-status-codes';

/**
 * @swagger
 * tags:
 *   name: Accounts
 *   description: Bank / payment account management for deposit info sharing
 */

/**
 * @swagger
 * /api/up/accounts:
 *   get:
 *     summary: Get current user's bank accounts
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of accounts
 */
export const getAccounts = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('person_id', req.user.person_id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return successResponse(res, 'Accounts fetched successfully', data || []);
});

/**
 * @swagger
 * /api/up/accounts/{id}:
 *   get:
 *     summary: Get single account by ID
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Account details
 */
export const getAccountById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', id)
    .eq('person_id', req.user.person_id)
    .single();

  if (error || !data) return errorResponse(res, StatusCodes.NOT_FOUND, 'Account not found');

  return successResponse(res, 'Account fetched', data);
});

/**
 * @swagger
 * /api/up/accounts:
 *   post:
 *     summary: Add a bank account
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bank_name]
 *             properties:
 *               bank_name: { type: string }
 *               title: { type: string }
 *               acc_number: { type: string }
 *     responses:
 *       201:
 *         description: Account added
 */
export const createAccount = asyncHandler(async (req, res) => {
  const { bank_name, title, acc_number } = req.body;

  const { data, error } = await supabase
    .from('accounts')
    .insert({
      person_id: req.user.person_id,
      bank_name,
      title: title || null,
      acc_number: acc_number || null
    })
    .select()
    .single();

  if (error) throw error;

  return successResponse(res, 'Account added successfully', data);
});

/**
 * @swagger
 * /api/up/accounts/{id}:
 *   patch:
 *     summary: Update a bank account
 *     tags: [Accounts]
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
 *               bank_name: { type: string }
 *               title: { type: string }
 *               acc_number: { type: string }
 *     responses:
 *       200:
 *         description: Account updated
 */
export const updateAccount = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const { data: existing } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', id)
    .eq('person_id', req.user.person_id)
    .single();

  if (!existing) return errorResponse(res, StatusCodes.NOT_FOUND, 'Account not found');

  const { data, error } = await supabase
    .from('accounts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return successResponse(res, 'Account updated successfully', data);
});

/**
 * @swagger
 * /api/up/accounts/{id}:
 *   delete:
 *     summary: Delete a bank account
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Account deleted
 */
export const deleteAccount = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: existing } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', id)
    .eq('person_id', req.user.person_id)
    .single();

  if (!existing) return errorResponse(res, StatusCodes.NOT_FOUND, 'Account not found');

  const { error } = await supabase.from('accounts').delete().eq('id', id);
  if (error) throw error;

  return successResponse(res, 'Account deleted successfully');
});
