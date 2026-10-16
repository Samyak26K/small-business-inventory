
import express from "express";
import path from "path";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import stockRoutes from "./routes/stockRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientPath = path.resolve(__dirname, "../client");

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Register API routes BEFORE the 404 handler.
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);

// Health check
app.get("/api/health", (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;

  res.status(200).json({
    success: true,
    message: "Inventory API is running",
    databaseReady
  });
});

// Serve frontend files
app.use(express.static(clientPath));

app.get("/", (req, res) => {
  res.redirect("/login.html");
});

// Keep this as the final handler.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Resource not found"
  });
});

export default app;
