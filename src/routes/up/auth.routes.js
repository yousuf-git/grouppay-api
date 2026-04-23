import express from 'express';
import * as authController from '../../controllers/up/auth.controller.js';
import { validate } from '../../middlewares/validators.middleware.js';
import * as authValidator from '../../validators/up/auth.validator.js';
import { protect } from '../../middlewares/token.middleware.js';

const router = express.Router();

router.post('/signup', validate(authValidator.signupSchema), authController.signup);
router.post('/login', validate(authValidator.loginSchema), authController.login);
router.post('/verify-email', validate(authValidator.verifyEmailSchema), authController.verifyEmail);
router.post('/forgot-password', validate(authValidator.forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(authValidator.resetPasswordSchema), authController.resetPassword);

router.patch('/profile', protect, validate(authValidator.updateProfileSchema), authController.updateProfile);

export default router;
