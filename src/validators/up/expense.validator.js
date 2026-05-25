import Joi from 'joi';

export const createExpenseSchema = Joi.object({
  amount: Joi.number().positive().required(),
  type: Joi.string().valid('CREDIT', 'DEBIT').required(),
  location: Joi.string().allow('', null),
  note: Joi.string().allow('', null),
  date_time: Joi.string().isoDate().allow(null),
  img_url: Joi.array().items(Joi.string().uri()).allow(null)
});

export const updateExpenseSchema = Joi.object({
  amount: Joi.number().positive(),
  type: Joi.string().valid('CREDIT', 'DEBIT'),
  location: Joi.string().allow('', null),
  note: Joi.string().allow('', null),
  date_time: Joi.string().isoDate(),
  img_url: Joi.array().items(Joi.string().uri()).allow(null)
}).min(1);
