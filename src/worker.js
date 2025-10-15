// Background worker to process jobs and cancel expired pending orders (>15 minutes)
require("dotenv").config();
const { connectDB } = require("./utils/db");
const Job = require("./models/Job");
const Order = require("./models/Order");
const Product = require("./models/Product");

async function processJobs() {
  // simple polling loop
  const job = await Job.findOneAndUpdate(
    { status: "PENDING" },
    { status: "PROCESSING" },
    { new: true }
  );
  if (job) {
    try {
      if (job.type === "SEND_ORDER_CONFIRMATION") {
        // simulate sending email
        console.log("Simulated email send for", job.payload);
      }
      job.status = "DONE";
      await job.save();
    } catch (err) {
      job.status = "FAILED";
      await job.save();
    }
  }
}

async function cancelExpiredOrders() {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  const expired = await Order.find({
    status: "PENDING_PAYMENT",
    createdAt: { $lt: fifteenMinutesAgo },
  });
  for (const order of expired) {
    const session = await await require("mongoose").startSession();
    session.startTransaction();
    try {
      // release reserved stock
      for (const it of order.items) {
        const product = await Product.findById(it.productId).session(session);
        if (product) {
          product.reservedStock -= it.quantity;
          if (product.reservedStock < 0) product.reservedStock = 0;
          await product.save({ session });
        }
      }
      order.status = "CANCELLED";
      await order.save({ session });
      await session.commitTransaction();
      session.endSession();
      console.log("Cancelled expired order", order._id.toString());
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("Failed cancelling expired order", order._id, err);
    }
  }
}

async function loop() {
  while (true) {
    try {
      await processJobs();
      await cancelExpiredOrders();
    } catch (err) {
      console.error(err);
    }
    // wait 5 seconds
    await new Promise((r) => setTimeout(r, 5000));
  }
}

connectDB()
  .then(() => {
    console.log("Worker started");
    loop();
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
