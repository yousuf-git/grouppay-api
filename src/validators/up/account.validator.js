import Joi from 'joi';

export const createAccountSchema = Joi.object({
  bank_name: Joi.string().required(),
  title: Joi.string().allow('', null),
  acc_number: Joi.string().allow('', null)
});

export const updateAccountSchema = Joi.object({
  bank_name: Joi.string(),
  title: Joi.string().allow('', null),
  acc_number: Joi.string().allow('', null)
}).min(1);
