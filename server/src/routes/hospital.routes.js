import { Router } from "express";
import { listNearbyHospitals } from "../controllers/hospital.controller.js";

const router = Router();
router.get("/hospitals", (req, res, next) =>
  Promise.resolve(listNearbyHospitals(req, res)).catch(next),
);

export default router;
