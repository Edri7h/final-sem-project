import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  readEmergencyCard,
  submitEmergencyAlert,
} from "../controllers/emergency.controller.js";

const router = Router();
const wrap = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
const publicAlertLimit = rateLimit({
  windowMs: 60000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/:token", wrap(readEmergencyCard));
router.post("/:token/alerts", publicAlertLimit, wrap(submitEmergencyAlert));

export default router;
