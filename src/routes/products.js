const express = require("express");
const router = express.Router();
const { authMiddleware, adminOnly } = require("../middlewares/auth");
const Product = require("../models/Product");
const validator = require("../validators/product");

// Create product (admin)
router.post("/", authMiddleware, adminOnly, async (req, res, next) => {
  try {
    const { error, value } = validator.create.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });
    const p = new Product(value);
    await p.save();
    res.status(201).json(p);
  } catch (err) {
    next(err);
  }
});

// Update product (admin)
router.put("/:id", authMiddleware, adminOnly, async (req, res, next) => {
  try {
    const { error, value } = validator.update.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });
    const p = await Product.findByIdAndUpdate(req.params.id, value, {
      new: true,
    });
    if (!p) return res.status(404).json({ error: "Not found" });
    res.json(p);
  } catch (err) {
    next(err);
  }
});

// Delete product (admin)
router.delete("/:id", authMiddleware, adminOnly, async (req, res, next) => {
  try {
    const p = await Product.findByIdAndDelete(req.params.id);
    if (!p) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
});

// List products (public) with pagination, sorting, filtering
router.get("/", async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = "name",
      order = "asc",
      name,
    } = req.query;
    const skip = (page - 1) * limit;
    const sortObj = {};
    sortObj[sort] = order === "asc" ? 1 : -1;
    const filter = {};
    if (name) filter.name = new RegExp(name, "i");
    const total = await Product.countDocuments(filter);
    const items = await Product.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit));
    res.json({ page: Number(page), limit: Number(limit), total, items });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
