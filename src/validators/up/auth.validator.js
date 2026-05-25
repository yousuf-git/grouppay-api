import Joi from 'joi';

export const signupSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  fullname: Joi.string().required(),
  phone: Joi.string().allow('', null)
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export const verifyEmailSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).required()
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(6).required()
});

export const updateProfileSchema = Joi.object({
  fullname: Joi.string(),
  phone: Joi.string().allow('', null),
  username: Joi.string(),
  profile_picture_url: Joi.string().uri().allow('', null)
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required()
});

export const resetPasswordOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).required(),
  newPassword: Joi.string().min(6).required()
});
