
import { Router } from "express";
import { getInventoryReport } from "../controllers/reportController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/inventory", getInventoryReport);

export default router;
