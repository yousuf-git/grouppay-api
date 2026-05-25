import Joi from 'joi';

const participantSchema = Joi.object({
  person_id: Joi.number().required(),
  paid_amount: Joi.number().min(0).required(),
  additional_amount: Joi.number().required(),
  participant_category: Joi.string().valid('SHARING', 'INDIVIDUAL').default('SHARING')
});

export const createSceneSchema = Joi.object({
  group_id: Joi.number().required(),
  location: Joi.string().required(),
  description: Joi.string().allow('', null),
  scene_timestamptz: Joi.string().isoDate().required(),
  total_amount: Joi.number().positive().required(),
  image_url: Joi.string().uri().allow('', null),
  participants: Joi.array().items(participantSchema).min(1).required()
});

export const updateSceneSchema = Joi.object({
  location: Joi.string(),
  description: Joi.string().allow('', null),
  scene_timestamptz: Joi.string().isoDate(),
  total_amount: Joi.number().positive(),
  image_url: Joi.string().uri().allow('', null),
  participants: Joi.array().items(participantSchema).min(1)
});
