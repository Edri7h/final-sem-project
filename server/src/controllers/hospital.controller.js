import { z } from "zod";
import { nearbyHospitals } from "../services/hospitals.js";

export async function listNearbyHospitals(req, res) {
  const { latitude, longitude } = z
    .object({
      latitude: z.coerce.number().min(-90).max(90),
      longitude: z.coerce.number().min(-180).max(180),
    })
    .parse(req.query);

  try {
    const data = await nearbyHospitals(latitude, longitude);
    return res.json({ data });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "hospital_search_failed",
        message: error.message,
      }),
    );
    return res
      .status(503)
      .json({ error: "Nearby hospital search is temporarily unavailable." });
  }
}
