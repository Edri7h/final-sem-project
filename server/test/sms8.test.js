import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import {
  checkPhoneVerification,
  sendAlertSms,
  Sms8Error,
  startPhoneVerification,
} from "../src/services/sms8.js";

const previousApiKey = process.env.SMS8_API_KEY;
const previousNodeEnv = process.env.NODE_ENV;

beforeEach(() => {
  process.env.SMS8_API_KEY = "test-sms8-key";
  process.env.NODE_ENV = "test";
});

afterEach(() => {
  mock.restoreAll();
  if (previousApiKey === undefined) delete process.env.SMS8_API_KEY;
  else process.env.SMS8_API_KEY = previousApiKey;
  if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousNodeEnv;
});

test("sends alert SMS using SMS8 form API and preserves queued status", async () => {
  let request;
  mock.method(globalThis, "fetch", async (url, options) => {
    request = { url, options };
    return Response.json({
      success: true,
      data: { messages: [{ ID: 123, status: "Pending" }] },
    });
  });

  const result = await sendAlertSms("+919876543210", "Emergency alert");

  assert.equal(result.providerId, "123");
  assert.equal(result.status, "PENDING");
  assert.equal(request.url, "https://app.sms8.io/services/send.php");
  assert.equal(request.options.method, "POST");
  const form = new URLSearchParams(request.options.body);
  assert.equal(form.get("key"), "test-sms8-key");
  assert.equal(form.get("number"), "+919876543210");
  assert.equal(form.get("message"), "Emergency alert");
});

test("sends OTP through SMS8 with bearer authentication", async () => {
  let request;
  mock.method(globalThis, "fetch", async (url, options) => {
    request = { url, options };
    return Response.json({ success: true });
  });

  await startPhoneVerification("+919876543210");

  assert.equal(request.url, "https://app.sms8.io/ajax/otp-send.php");
  assert.equal(request.options.headers.Authorization, "Bearer test-sms8-key");
  assert.equal(new URLSearchParams(request.options.body).get("phone"), "+919876543210");
});

test("accepts an OTP only when SMS8 confirms it", async () => {
  mock.method(globalThis, "fetch", async () =>
    Response.json({ verified: true }),
  );

  assert.equal(await checkPhoneVerification("+919876543210", "123456"), true);
});

test("surfaces SMS8 provider errors without exposing request credentials", async () => {
  mock.method(globalThis, "fetch", async () =>
    Response.json(
      { success: false, error: { code: 402, message: "No credits" } },
      { status: 402 },
    ),
  );

  await assert.rejects(
    sendAlertSms("+919876543210", "Emergency alert"),
    (error) => {
      assert.ok(error instanceof Sms8Error);
      assert.equal(error.code, 402);
      assert.doesNotMatch(error.message, /test-sms8-key/);
      return true;
    },
  );
});
