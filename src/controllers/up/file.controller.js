import { uploadFile } from '../../services/file.service.js';
import { successResponse, errorResponse } from '../../services/utilities.service.js';
import asyncHandler from '../../services/asynchandler.js';
import { StatusCodes } from 'http-status-codes';

/**
 * @swagger
 * tags:
 *   name: Files
 *   description: File upload management
 */

/**
 * @swagger
 * /api/up/files/upload:
 *   post:
 *     summary: Upload a single file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               folder:
 *                 type: string
 *     responses:
 *       200:
 *         description: File uploaded successfully
 */
export const uploadSingleFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    return errorResponse(res, StatusCodes.BAD_REQUEST, 'No file uploaded');
  }

  const folder = req.body.folder || 'general';
  const url = await uploadFile(req.file, folder);

  return successResponse(res, 'File uploaded successfully', { url });
});
