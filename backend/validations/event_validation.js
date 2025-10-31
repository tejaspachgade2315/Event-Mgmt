const Joi = require('joi');

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

const createEventSchema = Joi.object({
  users: Joi.array().items(objectId).min(1).required(),
  eventTimezone: Joi.string().required(),
  startLocal: Joi.string().required(),
  endLocal: Joi.string().required(),
});

const updateEventSchema = Joi.object({
  users: Joi.array().items(objectId).optional(),
  eventTimezone: Joi.string().optional(),
  startLocal: Joi.string().optional(),
  endLocal: Joi.string().optional(),
}).min(1);

const listEventsQuerySchema = Joi.object({
  userId: Joi.alternatives().try(
    objectId,
    Joi.array().items(objectId).min(1)
  ).required(),
  from: Joi.date().iso().optional().allow(null),
  to: Joi.date().iso().optional().allow(null),
  limit: Joi.number().integer().min(1).max(100).optional(),
  page: Joi.number().integer().min(1).optional(),
  viewerTimezone: Joi.string().optional()
});

module.exports = {
  createEventSchema,
  updateEventSchema,
  listEventsQuerySchema
};