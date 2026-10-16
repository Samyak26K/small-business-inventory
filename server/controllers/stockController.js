
import mongoose from "mongoose";
import Product from "../models/Product.js";
import StockMovement from "../models/StockMovement.js";

function sendError(res, error) {
  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  console.error("Stock operation failed:", error.message);

  return res.status(500).json({
    success: false,
    message: "Unable to complete the stock operation."
  });
}

export async function createMovement(req, res) {
  const { productId, type, quantity, reason, reference = "" } = req.body ?? {};

  if (!mongoose.isValidObjectId(productId)) {
    return res.status(400).json({
      success: false,
      message: "A valid product is required."
    });
  }

  if (!["IN", "OUT", "ADJUSTMENT"].includes(type)) {
    return res.status(400).json({
      success: false,
      message: "Movement type must be IN, OUT or ADJUSTMENT."
    });
  }


const minimumQuantity = type === "ADJUSTMENT" ? 0 : 1;

if (
  !Number.isInteger(quantity) ||
  quantity < minimumQuantity
) {
  return res.status(400).json({
    success: false,
    message: type === "ADJUSTMENT"
      ? "Adjustment quantity must be a non-negative whole number."
      : "Stock-in and stock-out quantities must be positive whole numbers."
  });
}


  if (typeof reason !== "string" || !reason.trim()) {
    return res.status(400).json({
      success: false,
      message: "A reason is required."
    });
  }

  if (reason.trim().length > 300) {
    return res.status(400).json({
      success: false,
      message: "Reason must be 300 characters or fewer."
    });
  }

  if (typeof reference !== "string" || reference.length > 100) {
    return res.status(400).json({
      success: false,
      message: "Reference must be 100 characters or fewer."
    });
  }

  const session = await mongoose.startSession();

  try {
    let createdMovement;

    await session.withTransaction(async () => {
      const product = await Product.findOne({
        _id: productId,
        active: true
      }).session(session);

      if (!product) {
        const error = new Error("Active product not found.");
        error.statusCode = 404;
        throw error;
      }

      const before = product.quantityOnHand;
      let after;

      if (type === "IN") {
        after = before + quantity;
      } else if (type === "OUT") {
        if (before < quantity) {
          const error = new Error("Insufficient stock available.");
          error.statusCode = 409;
          throw error;
        }
        after = before - quantity;
      } else {
        // ADJUSTMENT quantity is the new physical stock count.
        after = quantity;
      }

      // Compare-and-set prevents lost updates if stock changes concurrently.
      const updated = await Product.updateOne(
        {
          _id: product._id,
          active: true,
          quantityOnHand: before
        },
        {
          $set: { quantityOnHand: after }
        },
        { session }
      );

      if (updated.modifiedCount !== 1) {
        const error = new Error(
          "Stock changed concurrently. Please retry the operation."
        );
        error.statusCode = 409;
        throw error;
      }

      const [movement] = await StockMovement.create(
        [{
          productId: product._id,
          type,
          quantity,
          quantityBefore: before,
          quantityAfter: after,
          reason: reason.trim(),
          reference: reference.trim(),
          performedBy: req.user.id
        }],
        { session }
      );

      createdMovement = movement;
    });

    return res.status(201).json({
      success: true,
      message: "Stock movement recorded successfully.",
      movement: createdMovement
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    return sendError(res, error);
  } finally {
    await session.endSession();
  }
}


export async function listMovements(req, res) {
  try {
    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
    );

    const filter = {};

    if (req.query.productId) {
      if (!mongoose.isValidObjectId(req.query.productId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid product ID."
        });
      }

      filter.productId = req.query.productId;
    }

    if (req.query.type) {
      if (!["IN", "OUT", "ADJUSTMENT"].includes(req.query.type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid movement type."
        });
      }

      filter.type = req.query.type;
    }

    const [movements, total] = await Promise.all([
      StockMovement.find(filter)
        .populate("productId", "name sku")
        .populate("performedBy", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      StockMovement.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      movements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    return sendError(res, error);
  }
}
