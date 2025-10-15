const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    payload: { type: Object },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "DONE", "FAILED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Job", jobSchema);
