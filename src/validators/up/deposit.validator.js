import Joi from 'joi';

export const createDepositSchema = Joi.object({
  group_id: Joi.number().required(),
  receiver_id: Joi.number().required(),
  amount: Joi.number().positive().required(),
  deposit_type: Joi.string().valid('CASH', 'BANK_TRANSFER', 'OTHER').default('CASH'),
  description: Joi.string().allow('', null),
  attachment_url: Joi.string().uri().allow('', null)
});

export const updateDepositStatusSchema = Joi.object({
  status: Joi.string().valid('APPROVED', 'REJECTED').required()
});

export const updateDepositSchema = Joi.object({
  amount: Joi.number().positive(),
  deposit_type: Joi.string().valid('CASH', 'BANK_TRANSFER', 'OTHER'),
  description: Joi.string().allow('', null),
  attachment_url: Joi.string().uri().allow('', null)
}).min(1);
