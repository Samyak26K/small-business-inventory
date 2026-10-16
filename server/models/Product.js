
import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 40
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    quantityOnHand: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Quantity must be a whole number."
      },
      default: 0
    },
    reorderLevel: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Reorder level must be a whole number."
      },
      default: 5
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ name: 1 });
productSchema.index({ categoryId: 1, active: 1 });

export default mongoose.model("Product", productSchema);
