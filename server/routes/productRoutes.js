
import { Router } from "express";
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  archiveProduct,
  listCategories
} from "../controllers/productController.js";
import {
  requireAuth,
  requireAdmin
} from "../middleware/auth.js";

const router = Router();

// Every route in this router requires a valid login.
router.use(requireAuth);

router.get("/categories", listCategories);

router.get("/", listProducts);
router.get("/:id", getProduct);

router.post("/", requireAdmin, createProduct);
router.patch("/:id", requireAdmin, updateProduct);
router.patch("/:id/archive", requireAdmin, archiveProduct);

export default router;
