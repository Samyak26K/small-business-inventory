
import "dotenv/config";
import mongoose from "mongoose";
import Category from "../models/Category.js";

const defaults = [
  { name: "Electronics", description: "Electronic devices and accessories" },
  { name: "Grocery", description: "Food and household essentials" },
  { name: "Stationery", description: "Office and school supplies" },
  { name: "Accessories", description: "General accessories" }
];

async function seedCategories() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    for (const item of defaults) {
      await Category.updateOne(
        { name: item.name },
        { $setOnInsert: item },
        { upsert: true }
      );
    }

    console.log("Demo categories are ready.");
  } catch (error) {
    console.error("Category seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

await seedCategories();
