
import mongoose from "mongoose";
import Product from "../models/Product.js";
import Category from "../models/Category.js";

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

function handleError(res, error) {
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "A product with this SKU already exists."
    });
  }

  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  console.error("Product operation failed:", error.message);

  return res.status(500).json({
    success: false,
    message: "Unable to complete the product operation."
  });
}

function validateProductInput(body, partial = false) {
  const fields = [
    "name",
    "sku",
    "categoryId",
    "description",
    "unitPrice",
    "quantityOnHand",
    "reorderLevel"
  ];

  for (const field of fields) {
    if (!partial && body[field] === undefined) {
      return `${field} is required.`;
    }
  }

  if (body.name !== undefined &&
      (typeof body.name !== "string" || !body.name.trim())) {
    return "Product name is required.";
  }

  if (body.sku !== undefined &&
      (typeof body.sku !== "string" || !body.sku.trim())) {
    return "SKU is required.";
  }

  if (body.categoryId !== undefined &&
      !isValidId(body.categoryId)) {
    return "A valid category is required.";
  }

  if (body.description !== undefined &&
      typeof body.description !== "string") {
    return "Description must be text.";
  }

  if (body.unitPrice !== undefined &&
      (typeof body.unitPrice !== "number" ||
       !Number.isFinite(body.unitPrice) ||
       body.unitPrice < 0)) {
    return "Unit price must be a valid non-negative number.";
  }

  for (const field of ["quantityOnHand", "reorderLevel"]) {
    if (body[field] !== undefined &&
        (!Number.isInteger(body[field]) || body[field] < 0)) {
      return `${field} must be a non-negative whole number.`;
    }
  }

  return null;
}

export async function listProducts(req, res) {
  try {
    const {
      search = "",
      categoryId = "",
      status = "all",
      page = "1",
      limit = "50"
    } = req.query;

    const pageNumber = Number(page);
    const pageSize = Number(limit);

    if (
      !Number.isInteger(pageNumber) || pageNumber < 1 ||
      !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid page or limit."
      });
    }

    const filter = {};

    if (status === "active") {
  filter.active = true;
} else if (status === "archived") {
  filter.active = false;
} else if (status === "low-stock") {
  filter.active = true;
  filter.$expr = {
    $lte: ["$quantityOnHand", "$reorderLevel"]
  };
} else if (status === "out-of-stock") {
  filter.active = true;
  filter.quantityOnHand = 0;
} else if (status === "in-stock") {
  filter.active = true;
  filter.quantityOnHand = { $gt: 0 };
} else if (status !== "all") {
  return res.status(400).json({
    success: false,
    message: "Invalid product status filter."
  });
}

    if (search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { sku: { $regex: escaped, $options: "i" } }
      ];
    }

    if (categoryId) {
      if (!isValidId(categoryId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID."
        });
      }
      filter.categoryId = categoryId;
    }

    const products = await Product.find(filter)
      .populate("categoryId", "name")
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize);

    const total = await Product.countDocuments(filter);

    return res.json({
      success: true,
      products,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function getProduct(req, res) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID."
      });
    }

    const product = await Product.findById(req.params.id)
      .populate("categoryId", "name");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found."
      });
    }

    return res.json({ success: true, product });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function createProduct(req, res) {
  try {
    const validationError = validateProductInput(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError
      });
    }

    const sku = req.body.sku.trim().toUpperCase();

    const existing = await Product.findOne({ sku });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A product with this SKU already exists."
      });
    }

    const category = await Category.findOne({
      _id: req.body.categoryId,
      active: true
    });

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Select an active category."
      });
    }

    const product = await Product.create({
      name: req.body.name.trim(),
      sku,
      categoryId: category._id,
      description: req.body.description ?? "",
      unitPrice: req.body.unitPrice,
      quantityOnHand: req.body.quantityOnHand,
      reorderLevel: req.body.reorderLevel
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully.",
      product
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function updateProduct(req, res) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID."
      });
    }

    const validationError = validateProductInput(req.body, true);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError
      });
    }

    // Quantity changes belong to the stock-movement module.
    if ("quantityOnHand" in req.body) {
      return res.status(400).json({
        success: false,
        message: "Use the stock movement API to change quantity."
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found."
      });
    }

    if (!product.active) {
      return res.status(409).json({
        success: false,
        message: "Archived products cannot be edited."
      });
    }

    if (req.body.categoryId !== undefined) {
      const category = await Category.findOne({
        _id: req.body.categoryId,
        active: true
      });

      if (!category) {
        return res.status(400).json({
          success: false,
          message: "Select an active category."
        });
      }
      product.categoryId = category._id;
    }

    if (req.body.name !== undefined) {
      product.name = req.body.name.trim();
    }

    if (req.body.sku !== undefined) {
      product.sku = req.body.sku.trim().toUpperCase();
    }

    if (req.body.description !== undefined) {
      product.description = req.body.description;
    }

    if (req.body.unitPrice !== undefined) {
      product.unitPrice = req.body.unitPrice;
    }

    if (req.body.reorderLevel !== undefined) {
      product.reorderLevel = req.body.reorderLevel;
    }

    await product.save();

    return res.json({
      success: true,
      message: "Product updated successfully.",
      product
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function archiveProduct(req, res) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID."
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found."
      });
    }

    product.active = false;
    await product.save();

    return res.json({
      success: true,
      message: "Product archived successfully."
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function listCategories(req, res) {
  try {
    const categories = await Category.find({ active: true })
      .sort({ name: 1 })
      .select("name description");

    return res.json({ success: true, categories });
  } catch (error) {
    return handleError(res, error);
  }
}
