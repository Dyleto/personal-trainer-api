import express from "express";
import userRoutes from "./users";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();

// Toutes les routes doivent être identifiées
router.use(authMiddleware);

router.use("/users", userRoutes);

export default router;
