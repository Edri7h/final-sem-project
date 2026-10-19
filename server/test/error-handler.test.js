import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { Sms8Error } from "../src/services/sms8.js";
import { errorHandler, notFoundHandler } from "../src/middleware/error-handler.js";

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("validation errors return field-level details", () => {
  let validationError;
  try {
    z.object({ email: z.string().email() }).parse({ email: "bad" });
  } catch (error) {
    validationError = error;
  }

  const res = responseRecorder();
  errorHandler(validationError, { id: "request-1" }, res, assert.fail);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "Validation failed");
  assert.equal(res.body.details[0].field, "email");
});

test("unexpected failures do not expose internal error text", () => {
  const res = responseRecorder();
  const originalEnvironment = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  try {
    errorHandler(
      new Error("database password=secret-value"),
      { id: "request-2" },
      res,
      assert.fail,
    );
  } finally {
    if (originalEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnvironment;
  }

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error, "Internal server error");
  assert.equal(JSON.stringify(res.body).includes("secret-value"), false);
});

test("provider errors return safe messages without upstream diagnostics", () => {
  const res = responseRecorder();
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    errorHandler(
      new Sms8Error("upstream response leaked private details", 502, 400),
      { id: "request-provider" },
      res,
      assert.fail,
    );
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(res.statusCode, 502);
  assert.equal(
    res.body.error,
    "SMS delivery is temporarily unavailable. Please try again later.",
  );
  assert.equal(JSON.stringify(res.body).includes("private details"), false);
});

test("unknown endpoints return an API 404 response", () => {
  const res = responseRecorder();
  notFoundHandler({ id: "request-3" }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error, "Route not found");
});
