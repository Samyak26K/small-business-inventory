
import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
      unique: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: 250,
      default: ""
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

categorySchema.index({ name: 1 }, { unique: true });

export default mongoose.model("Category", categorySchema);
