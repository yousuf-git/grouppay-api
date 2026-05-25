import { supabase } from '../../database/database.js';
import { hashPassword, comparePassword, generateOTP } from '../../services/auth.service.js';
import { generateToken, verifyToken } from '../../services/token.service.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../../services/email.service.js';
import { successResponse, errorResponse } from '../../services/utilities.service.js';
import asyncHandler from '../../services/asynchandler.js';
import { StatusCodes } from 'http-status-codes';

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: User authentication and profile management
 */

/**
 * @swagger
 * /api/up/auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, fullname]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *               fullname: { type: string }
 *               phone: { type: string }
 *     responses:
 *       200:
 *         description: Registration successful
 */
export const signup = asyncHandler(async (req, res) => {
  const { email, password, fullname, phone } = req.body;

  const { data: existingUser } = await supabase
    .from('person')
    .select('email')
    .eq('email', email)
    .single();

  if (existingUser) {
    return errorResponse(res, StatusCodes.BAD_REQUEST, 'Email already registered');
  }

  const hashedPassword = await hashPassword(password);
  const otp = generateOTP();

  const { data: user, error } = await supabase
    .from('person')
    .insert({
      email,
      password: hashedPassword,
      fullname,
      phone: phone || '',
      username: email.split('@')[0],
      email_verified: false,
      verification_otp: otp,
      otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  await sendVerificationEmail(email, otp);

  return successResponse(res, 'Registration successful. Please check your email for verification code.', {
    user: {
      id: user.person_id,
      email: user.email,
      fullname: user.fullname
    }
  });
});

/**
 * @swagger
 * /api/up/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { data: user, error } = await supabase
    .from('person')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !user) {
    return errorResponse(res, StatusCodes.UNAUTHORIZED, 'Invalid credentials');
  }

  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) {
    return errorResponse(res, StatusCodes.UNAUTHORIZED, 'Invalid credentials');
  }

  if (!user.email_verified) {
    return errorResponse(res, StatusCodes.FORBIDDEN, 'Please verify your email first');
  }

  const token = generateToken({ id: user.person_id, email: user.email });

  return successResponse(res, 'Login successful', {
    token,
    user: {
      id: user.person_id,
      email: user.email,
      fullname: user.fullname,
      username: user.username,
      profile_picture_url: user.profile_picture_url
    }
  });
});

/**
 * @swagger
 * /api/up/auth/verify-email:
 *   post:
 *     summary: Verify email with OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email: { type: string }
 *               otp: { type: string }
 *     responses:
 *       200:
 *         description: Email verified successfully
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const { data: user, error } = await supabase
    .from('person')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !user) {
    return errorResponse(res, StatusCodes.NOT_FOUND, 'User not found');
  }

  if (user.verification_otp !== otp) {
    return errorResponse(res, StatusCodes.BAD_REQUEST, 'Invalid OTP');
  }

  if (new Date(user.otp_expires_at) < new Date()) {
    return errorResponse(res, StatusCodes.BAD_REQUEST, 'OTP expired');
  }

  await supabase
    .from('person')
    .update({
      email_verified: true,
      verification_otp: null,
      otp_expires_at: null
    })
    .eq('person_id', user.person_id);

  return successResponse(res, 'Email verified successfully');
});

/**
 * @swagger
 * /api/up/auth/forgot-password:
 *   post:
 *     summary: Request password reset link
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string }
 *     responses:
 *       200:
 *         description: Reset link sent
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const { data: user, error } = await supabase
    .from('person')
    .select('person_id, email')
    .eq('email', email)
    .single();

  if (!user) {
    return successResponse(res, 'If an account exists, a reset link has been sent');
  }

  const resetToken = generateToken({ id: user.person_id, type: 'reset' });
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  await sendPasswordResetEmail(email, resetUrl);

  return successResponse(res, 'Password reset link sent to your email');
});

/**
 * @swagger
 * /api/up/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token: { type: string }
 *               newPassword: { type: string }
 *     responses:
 *       200:
 *         description: Password reset successful
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  const decoded = verifyToken(token);
  if (!decoded || decoded.type !== 'reset') {
    return errorResponse(res, StatusCodes.BAD_REQUEST, 'Invalid or expired reset token');
  }

  const hashedPassword = await hashPassword(newPassword);

  await supabase
    .from('person')
    .update({ password: hashedPassword })
    .eq('person_id', decoded.id);

  return successResponse(res, 'Password reset successful');
});

/**
 * @swagger
 * /api/up/auth/profile:
 *   patch:
 *     summary: Update user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullname: { type: string }
 *               phone: { type: string }
 *               username: { type: string }
 *               profile_picture_url: { type: string }
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const updates = req.body;

  const { data: user, error } = await supabase
    .from('person')
    .update(updates)
    .eq('person_id', req.user.person_id)
    .select('person_id, email, fullname, username, phone, profile_picture_url')
    .single();

  if (error) throw error;

  return successResponse(res, 'Profile updated successfully', user);
});

/**
 * @swagger
 * /api/up/auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile data
 */
export const getProfile = asyncHandler(async (req, res) => {
  const { data: user, error } = await supabase
    .from('person')
    .select('person_id, email, fullname, username, phone, profile_picture_url')
    .eq('person_id', req.user.person_id)
    .single();

  if (error) throw error;

  return successResponse(res, 'Profile fetched successfully', user);
});

/**
 * @swagger
 * /api/up/auth/resend-otp:
 *   post:
 *     summary: Resend email verification OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string }
 *     responses:
 *       200:
 *         description: OTP resent
 */
export const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const { data: user } = await supabase
    .from('person')
    .select('person_id, email_verified')
    .eq('email', email)
    .single();

  if (!user) return successResponse(res, 'If an account exists, a verification code has been sent');

  if (user.email_verified) {
    return errorResponse(res, StatusCodes.BAD_REQUEST, 'Email is already verified');
  }

  const otp = generateOTP();
  await supabase
    .from('person')
    .update({
      verification_otp: otp,
      otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    })
    .eq('person_id', user.person_id);

  await sendVerificationEmail(email, otp);

  return successResponse(res, 'Verification code sent successfully');
});

/**
 * @swagger
 * /api/up/auth/change-password:
 *   patch:
 *     summary: Change password (authenticated)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string }
 *     responses:
 *       200:
 *         description: Password changed
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const { data: user } = await supabase
    .from('person')
    .select('password')
    .eq('person_id', req.user.person_id)
    .single();

  const isMatch = await comparePassword(currentPassword, user.password);
  if (!isMatch) {
    return errorResponse(res, StatusCodes.BAD_REQUEST, 'Current password is incorrect');
  }

  const hashedPassword = await hashPassword(newPassword);
  await supabase
    .from('person')
    .update({ password: hashedPassword })
    .eq('person_id', req.user.person_id);

  return successResponse(res, 'Password changed successfully');
});

/**
 * @swagger
 * /api/up/auth/forgot-password-otp:
 *   post:
 *     summary: Request OTP-based password reset (mobile-friendly)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string }
 *     responses:
 *       200:
 *         description: OTP sent
 */
export const forgotPasswordOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const { data: user } = await supabase
    .from('person')
    .select('person_id')
    .eq('email', email)
    .single();

  if (!user) return successResponse(res, 'If an account exists, a reset code has been sent');

  const otp = generateOTP();
  await supabase
    .from('person')
    .update({
      verification_otp: otp,
      otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    })
    .eq('person_id', user.person_id);

  await sendVerificationEmail(email, otp);

  return successResponse(res, 'Password reset code sent to your email');
});

/**
 * @swagger
 * /api/up/auth/reset-password-otp:
 *   post:
 *     summary: Reset password using OTP (mobile-friendly)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp, newPassword]
 *             properties:
 *               email: { type: string }
 *               otp: { type: string }
 *               newPassword: { type: string }
 *     responses:
 *       200:
 *         description: Password reset successful
 */
export const resetPasswordOtp = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const { data: user } = await supabase
    .from('person')
    .select('person_id, verification_otp, otp_expires_at')
    .eq('email', email)
    .single();

  if (!user) return errorResponse(res, StatusCodes.NOT_FOUND, 'User not found');

  if (user.verification_otp !== otp) {
    return errorResponse(res, StatusCodes.BAD_REQUEST, 'Invalid OTP');
  }

  if (new Date(user.otp_expires_at) < new Date()) {
    return errorResponse(res, StatusCodes.BAD_REQUEST, 'OTP expired');
  }

  const hashedPassword = await hashPassword(newPassword);
  await supabase
    .from('person')
    .update({
      password: hashedPassword,
      verification_otp: null,
      otp_expires_at: null
    })
    .eq('person_id', user.person_id);

  return successResponse(res, 'Password reset successful');
});
