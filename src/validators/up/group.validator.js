import Joi from 'joi';

export const createGroupSchema = Joi.object({
  name: Joi.string().required()
});

export const updateGroupSchema = Joi.object({
  name: Joi.string(),
  is_active: Joi.boolean()
});

export const toggleStarSchema = Joi.object({
  starred: Joi.boolean().required()
});

export const updateMemberRoleSchema = Joi.object({
  role: Joi.string().valid('ADMIN', 'MEMBER').required()
});
