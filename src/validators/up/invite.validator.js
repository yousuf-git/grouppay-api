import Joi from 'joi';

export const sendInviteSchema = Joi.object({
  group_id: Joi.number().required(),
  receiver_id: Joi.number().required()
});

export const updateInviteStatusSchema = Joi.object({
  status: Joi.string().valid('ACCEPTED', 'DECLINED').required()
});
