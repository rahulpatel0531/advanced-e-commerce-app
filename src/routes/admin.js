const express = require("express");
const router = express.Router();
const { authMiddleware, adminOnly } = require("../middlewares/auth");
const Order = require("../models/Order");

// Admin: list orders with filter by status
router.get("/orders", authMiddleware, adminOnly, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;
    const filter = {};
    if (status) filter.status = status;
    const total = await Order.countDocuments(filter);
    const items = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    res.json({ page: Number(page), limit: Number(limit), total, items });
  } catch (err) {
    next(err);
  }
});

// Admin: update order status to SHIPPED or DELIVERED
router.patch(
  "/orders/:id/status",
  authMiddleware,
  adminOnly,
  async (req, res, next) => {
    try {
      const { status } = req.body;
      if (!["SHIPPED", "DELIVERED", "CANCELLED"].includes(status))
        return res.status(400).json({ error: "Invalid status" });
      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).json({ error: "Order not found" });
      order.status = status;
      await order.save();
      res.json(order);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
