
import { Router } from "express";
import {
  createMovement,
  listMovements
} from "../controllers/stockController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

// Stock changes are administrator-only in this version.
router.post("/", requireAdmin, createMovement);

// Authenticated users can view the movement history.
router.get("/", listMovements);

export default router;
