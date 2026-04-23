import Joi from 'joi';

export const createAppealSchema = Joi.object({
  group_id: Joi.number().required(),
  message: Joi.string().required(),
  attachment_url: Joi.string().uri().allow('', null)
});

export const updateAppealSchema = Joi.object({
  status: Joi.string().valid('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'),
  comment: Joi.string().allow('', null)
});
