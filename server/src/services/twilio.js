import twilio from "twilio";
export function twilioClient() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN)
    return null;
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

export async function sendAlertSms(to, body) {
  const client = twilioClient();
  if (!client || !process.env.TWILIO_PHONE_NUMBER)
    throw new Error("SMS provider is not configured");
  const msg = await client.messages.create({
    to,
    from: process.env.TWILIO_PHONE_NUMBER,
    body,
  });
  return msg.sid;
}
export async function startPhoneVerification(phone) {
  const client = twilioClient();
  if (client && process.env.TWILIO_VERIFY_SERVICE_SID)
    return client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: phone, channel: "sms" });
  if (process.env.NODE_ENV === "production")
    throw new Error("Phone verification provider is not configured");
  const code = String(Math.floor(100000 + Math.random() * 900000));
  globalThis.devOtps ??= new Map();
  globalThis.devOtps.set(phone, { code, expires: Date.now() + 300000 });
  return { status: "pending", devCode: code };
}
export async function checkPhoneVerification(phone, code) {
  const client = twilioClient();
  if (client && process.env.TWILIO_VERIFY_SERVICE_SID) {
    const r = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: phone, code });
    return r.status === "approved";
  }
  if (process.env.NODE_ENV === "production")
    throw new Error("Phone verification provider is not configured");
  const saved = globalThis.devOtps?.get(phone);
  const ok = !!saved && saved.code === code && saved.expires > Date.now();
  if (ok) globalThis.devOtps.delete(phone);
  return ok;
}
