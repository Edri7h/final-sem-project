import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  authenticate,
  requireVerifiedPhone,
} from "../middleware/auth.js";
import {
  getContacts,
  getQrPng,
  getVehicleById,
  getVehicles,
  patchContact,
  patchVehicle,
  postContact,
  postRegenerateQr,
  postResendContactCode,
  postVerifyContact,
  postVehicle,
  removeContact,
  removeVehicle,
} from "../controllers/vehicle.controller.js";

const router = Router();
const wrap = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
const otpLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  keyGenerator: (req) => req.user.id,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({
      error:
        "Too many verification requests for this account. Wait 15 minutes before trying again.",
    }),
});
const requireOwner = [authenticate, requireVerifiedPhone];

router.get("/vehicles", ...requireOwner, wrap(getVehicles));
router.post("/vehicles", ...requireOwner, wrap(postVehicle));
router.get("/vehicles/:id", ...requireOwner, wrap(getVehicleById));
router.patch("/vehicles/:id", ...requireOwner, wrap(patchVehicle));
router.delete("/vehicles/:id", ...requireOwner, wrap(removeVehicle));
router.post("/vehicles/:id/qr/regenerate", ...requireOwner, wrap(postRegenerateQr));
router.get("/vehicles/:id/qr.png", ...requireOwner, wrap(getQrPng));

router.get("/contacts", ...requireOwner, wrap(getContacts));
router.post(
  "/vehicles/:id/contacts",
  ...requireOwner,
  otpLimit,
  wrap(postContact),
);
router.patch("/contacts/:id", ...requireOwner, wrap(patchContact));
router.post(
  "/contacts/:id/resend-verify",
  ...requireOwner,
  otpLimit,
  wrap(postResendContactCode),
);
router.post(
  "/contacts/:id/verify",
  ...requireOwner,
  otpLimit,
  wrap(postVerifyContact),
);
router.delete("/contacts/:id", ...requireOwner, wrap(removeContact));

export default router;
