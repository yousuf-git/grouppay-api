import Joi from 'joi';

export const createBalanceSchema = Joi.object({
  amount: Joi.number().positive().required(),
  type: Joi.string().valid('CREDIT', 'DEBIT').required(),
  description: Joi.string().allow('', null)
});

export const updateBalanceSchema = Joi.object({
  amount: Joi.number().positive(),
  type: Joi.string().valid('CREDIT', 'DEBIT'),
  description: Joi.string().allow('', null)
}).min(1);
