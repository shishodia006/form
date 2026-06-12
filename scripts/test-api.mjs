import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";

const testDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "website-intake-test-"));
process.env.DATA_DIR = testDataDir;
process.env.ADMIN_USERNAME = "test-admin";
process.env.ADMIN_PASSWORD = "test-password";
process.env.SESSION_SECRET = "test-session-secret-with-enough-random-text";

const { default: vercelHandler } = await import("../api/index.js");
const server = createServer((request, response) => {
  const requestUrl = new URL(request.url, "http://localhost");
  request.query = { path: requestUrl.pathname.replace(/^\/api\/?/, "") };
  vercelHandler(request, response);
});
server.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));

const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;
const submissionId = crypto.randomUUID();
const formData = {
  fullName: "Test User",
  businessName: "Test Business",
  phone: "+919999999999",
  email: "test@example.com",
  websiteType: "Business / Corporate",
  businessDescription: "A test business",
  targetAudience: "Test customers",
  primaryGoal: "Generate leads",
  uniqueValue: "Reliable testing",
  tone: ["Professional"],
  pages: ["Home", "Contact"],
  features: ["Contact Forms"],
  inspiration: "",
  brandStyle: "Clean & Minimal",
  primaryColor: "#7c3aed",
  hasLogo: "Yes, ready to use",
  designNotes: "",
  budget: "Test budget",
  timeline: "Flexible",
  contentReady: "Ready",
  launchDate: "",
  finalNotes: "",
  termsAccepted: true,
};
const file = {
  name: "requirements.txt",
  mimeType: "text/plain",
  size: 5,
  category: "Project file",
};

async function jsonRequest(pathname, options = {}) {
  const { headers, ...requestOptions } = options;
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...requestOptions,
    headers: { "Content-Type": "application/json", ...headers },
  });
  const body = await response.json();
  return { response, body };
}

try {
  const health = await jsonRequest("/api/health");
  assert.equal(health.response.status, 200);
  assert.equal(health.body.database, "local");

  const authorization = await jsonRequest("/api/uploads/authorize", {
    method: "POST",
    body: JSON.stringify({ submissionId, formData, files: [file] }),
  });
  assert.equal(authorization.response.status, 200);
  assert.equal(authorization.body.mode, "local");

  const created = await jsonRequest("/api/submissions", {
    method: "POST",
    body: JSON.stringify({
      submissionId,
      formData,
      files: [{ ...file, data: Buffer.from("hello").toString("base64") }],
      meta: { sourceUrl: "http://localhost/test", timezone: "Asia/Calcutta" },
    }),
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.submissionId, submissionId);

  const loginResponse = await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "test-admin", password: "test-password" }),
  });
  assert.equal(loginResponse.status, 200);
  const cookie = loginResponse.headers.get("set-cookie").split(";")[0];

  const listed = await jsonRequest("/api/admin/submissions", {
    headers: { Cookie: cookie },
  });
  assert.equal(listed.response.status, 200);
  assert.equal(listed.body.submissions.length, 1);
  assert.equal(listed.body.submissions[0].formData.fullName, "Test User");

  const updated = await jsonRequest(`/api/admin/submissions/${submissionId}`, {
    method: "PATCH",
    headers: { Cookie: cookie },
    body: JSON.stringify({ status: "Contacted" }),
  });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.body.submission.status, "Contacted");

  const storedName = listed.body.submissions[0].files[0].storedName;
  const downloaded = await fetch(`${baseUrl}/api/admin/files/${submissionId}/${storedName}`, {
    headers: { Cookie: cookie },
  });
  assert.equal(downloaded.status, 200);
  assert.equal(await downloaded.text(), "hello");

  console.log("API integration test passed.");
} finally {
  await new Promise((resolve) => server.close(resolve));
  await fs.rm(testDataDir, { recursive: true, force: true });
}
