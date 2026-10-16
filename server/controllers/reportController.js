
import Product from "../models/Product.js";

export async function getInventoryReport(req, res) {
  try {
    const status = req.query.status || "all";

    if (!["all", "low-stock", "out-of-stock"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report status."
      });
    }

    const filter = { active: true };

    if (status === "low-stock") {
      filter.$expr = {
        $and: [
          { $gt: ["$quantityOnHand", 0] },
          { $lte: ["$quantityOnHand", "$reorderLevel"] }
        ]
      };
    } else if (status === "out-of-stock") {
      filter.quantityOnHand = 0;
    }

    const products = await Product.find(filter)
      .populate("categoryId", "name")
      .sort({ name: 1 })
      .lean();

    const report = products.map((product) => ({
      name: product.name,
      sku: product.sku,
      category: product.categoryId?.name || "Uncategorized",
      quantityOnHand: product.quantityOnHand,
      reorderLevel: product.reorderLevel,
      unitPrice: product.unitPrice,
      inventoryValue: product.unitPrice * product.quantityOnHand,
      stockStatus:
        product.quantityOnHand === 0
          ? "Out of Stock"
          : product.quantityOnHand <= product.reorderLevel
            ? "Low Stock"
            : "In Stock"
    }));

    return res.status(200).json({
      success: true,
      total: report.length,
      report
    });
  } catch (error) {
    console.error("Inventory report failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to generate inventory report."
    });
  }
}
