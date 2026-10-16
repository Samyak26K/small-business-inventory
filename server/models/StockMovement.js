
import mongoose from "mongoose";

const stockMovementSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true
    },

    type: {
      type: String,
      enum: ["IN", "OUT", "ADJUSTMENT"],
      required: true
    },

quantity: {
  type: Number,
  required: true,
  min: 0,
  validate: {
    validator: function (value) {
      return this.type === "ADJUSTMENT"
        ? Number.isInteger(value) && value >= 0
        : Number.isInteger(value) && value >= 1;
    },
    message: "Invalid quantity for this movement type."
  }
},

    quantityBefore: {
      type: Number,
      required: true,
      min: 0
    },

    quantityAfter: {
      type: Number,
      required: true,
      min: 0
    },

    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300
    },

    reference: {
      type: String,
      trim: true,
      maxlength: 100,
      default: ""
    },

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

stockMovementSchema.index({ createdAt: -1 });
stockMovementSchema.index({ productId: 1, createdAt: -1 });

export default mongoose.model("StockMovement", stockMovementSchema);
