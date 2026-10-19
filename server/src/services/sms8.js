const SMS8_SEND_URL = "https://app.sms8.io/services/send.php";
const SMS8_OTP_SEND_URL = "https://app.sms8.io/ajax/otp-send.php";
const SMS8_OTP_VERIFY_URL = "https://app.sms8.io/ajax/otp-verify.php";
const SMS8_TIMEOUT_MS = 12_000;

export class Sms8Error extends Error {
  constructor(message, status = 502, code = null) {
    super(message);
    this.name = "Sms8Error";
    this.status = status;
    this.code = code;
  }
}

function getApiKey() {
  return process.env.SMS8_API_KEY?.trim() || "";
}

async function requestSms8(url, options) {
  try {
    return await fetch(url, options);
  } catch {
    throw new Sms8Error("Could not reach SMS8. Check connectivity and try again.");
  }
}

async function readResponse(response) {
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success === false) {
    const code = Number(body?.error?.code) || response.status;
    const message = body?.error?.message || "SMS8 request failed";
    throw new Sms8Error(message, code === 429 ? 429 : 502, code);
  }
  return body || {};
}

async function sendOtpRequest(url, phone, code) {
  const form = new URLSearchParams({ phone });
  if (code) form.set("code", code);

  const response = await requestSms8(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: form,
    signal: AbortSignal.timeout(SMS8_TIMEOUT_MS),
  });
  return readResponse(response);
}

export async function sendAlertSms(to, text) {
  const key = getApiKey();
  if (!key) throw new Sms8Error("SMS8 is not configured", 503);

  const form = new URLSearchParams({ key, number: to, message: text });
  const response = await requestSms8(SMS8_SEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: form,
    signal: AbortSignal.timeout(SMS8_TIMEOUT_MS),
  });
  const result = await readResponse(response);
  const message = result.data?.messages?.[0];
  if (!message) throw new Sms8Error("SMS8 did not return a message record");
  if (String(message.status).toLowerCase() === "failed") {
    throw new Sms8Error(message.error || "SMS8 could not queue the message");
  }

  return {
    providerId: String(message.ID || message.id || message.groupID || ""),
    status: String(message.status).toLowerCase() === "sent" ? "SENT" : "PENDING",
  };
}

export async function startPhoneVerification(phone) {
  if (getApiKey()) return sendOtpRequest(SMS8_OTP_SEND_URL, phone);
  if (process.env.NODE_ENV === "production") {
    throw new Sms8Error("SMS8 is not configured", 503);
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  globalThis.devOtps ??= new Map();
  globalThis.devOtps.set(phone, { code, expires: Date.now() + 300_000 });
  return { status: "pending", devCode: code };
}

export async function checkPhoneVerification(phone, code) {
  if (getApiKey()) {
    const result = await sendOtpRequest(SMS8_OTP_VERIFY_URL, phone, code);
    return result.verified === true;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Sms8Error("SMS8 is not configured", 503);
  }

  const saved = globalThis.devOtps?.get(phone);
  const verified = !!saved && saved.code === code && saved.expires > Date.now();
  if (verified) globalThis.devOtps.delete(phone);
  return verified;
}
