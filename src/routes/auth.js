const express = require("express");
const router = express.Router();
const Joi = require("joi");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const validator = require("../validators/auth");

router.post("/register", async (req, res, next) => {
  try {
    const { error, value } = validator.register.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });
    const existing = await User.findOne({ email: value.email });
    if (existing)
      return res.status(400).json({ error: "Email already registered" });
    const user = new User(value);
    await user.save();
    res.status(201).json({ message: "User created" });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { error, value } = validator.login.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });
    const user = await User.findOne({ email: value.email });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });
    const ok = await user.comparePassword(value.password);
    if (!ok) return res.status(400).json({ error: "Invalid credentials" });
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );
    res.json({ token });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
