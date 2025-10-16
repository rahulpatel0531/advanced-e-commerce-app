const Joi = require("joi");
exports.create = Joi.object({
  name: Joi.string().required(),
  price: Joi.number().positive().required(),
  description: Joi.string().allow(""),
  stock: Joi.number().integer().min(0).required(),
  availableStock: Joi.number().integer().min(0).optional(),
});
exports.update = Joi.object({
  name: Joi.string(),
  price: Joi.number().positive(),
  description: Joi.string().allow(""),
  availableStock: Joi.number().integer().min(0),
});
