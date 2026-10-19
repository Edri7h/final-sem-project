import { hash, verify } from "@node-rs/argon2";
import { randomInt } from "node:crypto";
import { sendAlertSms, Sms8Error } from "./sms8.js";
import {
  consumePhoneVerification,
  savePhoneVerification,
} from "../repositories/phone-verification.repository.js";

const CODE_TTL_MS = 10 * 60 * 1000;

export async function startPhoneVerification(phone, subjectType, subjectId) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  let delivery;

  if (process.env.SMS8_API_KEY?.trim()) {
    delivery = await sendAlertSms(
      phone,
       `Your Beacon code is ${code}.`,
    );
  } else if (process.env.NODE_ENV === "production") {
    throw new Sms8Error("SMS8 is not configured", 503);
  } else {
    delivery = { devCode: code, status: "DEVELOPMENT" };
  }

  await savePhoneVerification({
    subjectType,
    subjectId,
    phone,
    codeHash: await hash(code),
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  });
  if (!delivery.devCode) {
    console.info(
      JSON.stringify({
        event: "otp_sms_accepted",
        subjectType,
        subjectId,
        providerId: delivery.providerId || undefined,
        deliveryStatus: delivery.status,
      }),
    );
  }
  return delivery;
}

export function checkPhoneVerification(phone, code, subjectType, subjectId) {
  return consumePhoneVerification(subjectType, subjectId, phone, (codeHash) =>
    verify(codeHash, code),
  );
}
