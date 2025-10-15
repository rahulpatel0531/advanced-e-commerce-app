const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middlewares/auth");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const validator = require("../validators/cart");

// Get cart
router.get("/", authMiddleware, async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ userId: req.user._id }).populate(
      "items.productId"
    );
    if (!cart) return res.json({ items: [] });
    res.json(cart);
  } catch (err) {
    next(err);
  }
});

// Add/update item
router.post("/items", authMiddleware, async (req, res, next) => {
  try {
    const { error, value } = validator.addItem.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });
    const product = await Product.findById(value.productId);
    if (!product) return res.status(404).json({ error: "Product not found" });
    let cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      cart = new Cart({ userId: req.user._id, items: [] });
    }
    const idx = cart.items.findIndex(
      (i) => i.productId.toString() === value.productId
    );
    if (idx === -1) {
      cart.items.push({ productId: value.productId, quantity: value.quantity });
    } else {
      cart.items[idx].quantity = value.quantity;
    }
    await cart.save();
    res.json(cart);
  } catch (err) {
    next(err);
  }
});

// Remove item
router.delete("/items/:productId", authMiddleware, async (req, res, next) => {
  try {
    const productId = req.params.productId;
    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) return res.status(404).json({ error: "Cart not found" });
    cart.items = cart.items.filter((i) => i.productId.toString() !== productId);
    await cart.save();
    res.json(cart);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
