const Joi = require("joi");
exports.checkout = Joi.object({
  /* no body required for checkout - uses user's cart */
});

exports.pay = Joi.object({
  transactionId: Joi.string().required(),
  amount: Joi.number().positive().required(),
  status: Joi.string().valid("SUCCESS", "FAILED").required(),
});
