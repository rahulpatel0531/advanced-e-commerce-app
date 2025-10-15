const Joi = require("joi");
exports.create = Joi.object({
  name: Joi.string().required(),
  price: Joi.number().positive().required(),
  description: Joi.string().allow(""),
  availableStock: Joi.number().integer().min(0).required(),
});
exports.update = Joi.object({
  name: Joi.string(),
  price: Joi.number().positive(),
  description: Joi.string().allow(""),
  availableStock: Joi.number().integer().min(0),
});
