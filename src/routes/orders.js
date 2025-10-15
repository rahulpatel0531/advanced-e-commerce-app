const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { authMiddleware } = require("../middlewares/auth");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Payment = require("../models/Payment");
const Job = require("../models/Job");
const validator = require("../validators/order");

// Checkout: create order, reserve stock atomically
router.post("/checkout", authMiddleware, async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const cart = await Cart.findOne({ userId: req.user._id }).session(session);
    if (!cart || cart.items.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "Cart empty" });
    }
    // prepare order items
    const itemsDetailed = [];
    let total = 0;
    for (const it of cart.items) {
      const product = await Product.findById(it.productId).session(session);
      if (!product) throw new Error("Product not found: " + it.productId);
      // check available stock
      if (product.availableStock - product.reservedStock < it.quantity)
        throw new Error("Insufficient stock for " + product.name);
      // reserve stock (increase reservedStock)
      product.reservedStock += it.quantity;
      await product.save({ session });
      itemsDetailed.push({
        productId: product._id,
        quantity: it.quantity,
        priceAtPurchase: product.price,
      });
      total += product.price * it.quantity;
    }
    const order = new Order({
      userId: req.user._id,
      items: itemsDetailed,
      totalAmount: total,
      status: "PENDING_PAYMENT",
    });
    await order.save({ session });
    // keep cart intact or clear? we will clear cart
    cart.items = [];
    await cart.save({ session });
    await session.commitTransaction();
    session.endSession();
    res.status(201).json(order);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
});

// Pay (mock) - finalizes order if payment SUCCESS
router.post("/:id/pay", authMiddleware, async (req, res, next) => {
  try {
    const { error, value } = validator.pay.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.userId.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Forbidden" });
    if (order.status !== "PENDING_PAYMENT")
      return res.status(400).json({ error: "Order not pending payment" });
    // start transaction to commit payment and decrement stocks
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // create payment record
      const payment = new Payment({
        orderId: order._id,
        transactionId: value.transactionId,
        amount: value.amount,
        status: value.status,
      });
      await payment.save({ session });
      if (value.status !== "SUCCESS") {
        // fail: mark order cancelled and release reserved stock
        order.status = "CANCELLED";
        await order.save({ session });
        for (const it of order.items) {
          const product = await Product.findById(it.productId).session(session);
          product.reservedStock -= it.quantity;
          await product.save({ session });
        }
        await session.commitTransaction();
        session.endSession();
        return res
          .status(200)
          .json({ message: "Payment failed, order cancelled" });
      }
      // success: change order status, decrement availableStock and clear reservedStock for the quantities
      order.status = "PAID";
      await order.save({ session });
      for (const it of order.items) {
        const product = await Product.findById(it.productId).session(session);
        // reservedStock should be >= it.quantity
        product.reservedStock -= it.quantity;
        product.availableStock -= it.quantity;
        if (product.reservedStock < 0) product.reservedStock = 0;
        if (product.availableStock < 0) product.availableStock = 0;
        await product.save({ session });
      }
      // queue a confirmation email job (we create a Job doc)
      const job = new Job({
        type: "SEND_ORDER_CONFIRMATION",
        payload: { orderId: order._id, userId: order.userId },
      });
      await job.save({ session });
      await session.commitTransaction();
      session.endSession();
      res.json({ message: "Payment success, order paid" });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

// Get list of user's orders with pagination
router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const total = await Order.countDocuments({ userId: req.user._id });
    const items = await Order.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    res.json({ page: Number(page), limit: Number(limit), total, items });
  } catch (err) {
    next(err);
  }
});

// Get single order
router.get("/:id", authMiddleware, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "items.productId"
    );
    if (!order) return res.status(404).json({ error: "Not found" });
    if (order.userId.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Forbidden" });
    res.json(order);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
