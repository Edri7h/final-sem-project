import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate } from "../middleware/auth.js";
import {
  currentAccount,
  login,
  logout,
  readProfile,
  register,
  resendPhoneCode,
  updatePassword,
  updateProfile,
  verifyPhone,
} from "../controllers/account.controller.js";

const router = Router();
const wrap = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
const authLimit = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
const otpLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 12,
  keyGenerator: (req) => req.user.id,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({
      error:
        "Too many verification requests for this account. Wait one minute before trying again.",
    }),
});

router.post("/auth/register", authLimit, wrap(register));
router.post("/auth/login", authLimit, wrap(login));
router.post("/auth/logout", authenticate, wrap(logout));
router.get("/auth/me", authenticate, currentAccount);
router.post("/auth/verify-phone", authenticate, otpLimit, wrap(verifyPhone));
router.post("/auth/resend-code", authenticate, otpLimit, wrap(resendPhoneCode));
router.get("/users/profile", authenticate, readProfile);
router.patch("/users/profile", authenticate, wrap(updateProfile));
router.post("/users/change-password", authenticate, wrap(updatePassword));

export default router;
