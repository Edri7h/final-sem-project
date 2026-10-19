import { Router } from "express";
import {
  authenticate,
  requireAdmin,
  requireVerifiedPhone,
} from "../middleware/auth.js";
import {
  getAdminAlertList,
  getAdminOverview,
  getAlerts,
  getAuditLogList,
  getNotificationList,
  getUsers,
  getVehicles,
  patchAlertStatus,
  patchUser,
  patchVehicle,
} from "../controllers/alert.controller.js";

const router = Router();
const wrap = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
const owner = [authenticate, requireVerifiedPhone];
const administrator = [authenticate, requireAdmin];

router.get("/alerts", ...owner, wrap(getAlerts));
router.patch("/alerts/:id/status", ...owner, wrap(patchAlertStatus));
router.get("/admin/overview", ...administrator, wrap(getAdminOverview));
router.get("/admin/users", ...administrator, wrap(getUsers));
router.patch("/admin/users/:id", ...administrator, wrap(patchUser));
router.get("/admin/vehicles", ...administrator, wrap(getVehicles));
router.patch("/admin/vehicles/:id", ...administrator, wrap(patchVehicle));
router.get("/admin/alerts", ...administrator, wrap(getAdminAlertList));
router.get("/admin/notifications", ...administrator, wrap(getNotificationList));
router.get("/admin/audit-logs", ...administrator, wrap(getAuditLogList));

export default router;
