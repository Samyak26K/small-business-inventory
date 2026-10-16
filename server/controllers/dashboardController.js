
import Product from "../models/Product.js";
import StockMovement from "../models/StockMovement.js";

export async function getDashboardStats(req, res) {
  try {
    const [
      totalProducts,
      stockSummary,
      lowStockProducts,
      outOfStockProducts,
      recentMovements
    ] = await Promise.all([
      Product.countDocuments({ active: true }),

      Product.aggregate([
        { $match: { active: true } },
        {
          $group: {
            _id: null,
            totalUnits: { $sum: "$quantityOnHand" },
            inventoryValue: {
              $sum: {
                $multiply: ["$unitPrice", "$quantityOnHand"]
              }
            }
          }
        }
      ]),

      Product.countDocuments({
        active: true,
        $expr: {
          $and: [
            { $gt: ["$quantityOnHand", 0] },
            { $lte: ["$quantityOnHand", "$reorderLevel"] }
          ]
        }
      }),

      Product.countDocuments({
        active: true,
        quantityOnHand: 0
      }),

      StockMovement.find()
        .populate("productId", "name sku")
        .populate("performedBy", "name")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);

    const summary = stockSummary[0] || {
      totalUnits: 0,
      inventoryValue: 0
    };

    return res.status(200).json({
      success: true,
      stats: {
        totalProducts,
        totalUnits: summary.totalUnits,
        inventoryValue: summary.inventoryValue,
        lowStockProducts,
        outOfStockProducts
      },
      recentMovements
    });
  } catch (error) {
    console.error("Dashboard statistics failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load dashboard statistics."
    });
  }
}
