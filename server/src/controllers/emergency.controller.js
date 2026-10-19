import { emergencySubmissionSchema } from "../validators.js";
import {
  createConfirmedEmergencyAlert,
  getEmergencyCard,
} from "../services/emergency.service.js";

export async function readEmergencyCard(req, res) {
  const card = await getEmergencyCard(req.params.token);
  if (!card) {
    return res.status(404).json({ error: "This emergency QR is unavailable" });
  }

  res.set("Cache-Control", "no-store");
  return res.json(card);
}

export async function submitEmergencyAlert(req, res) {
  const submission = emergencySubmissionSchema.parse(req.body);
  const result = await createConfirmedEmergencyAlert(
    req.params.token,
    submission,
  );
  if (!result) {
    return res.status(404).json({ error: "This emergency QR is unavailable" });
  }
  return res.status(201).json(result);
}
