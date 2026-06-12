import assert from "node:assert/strict";
import { createServer } from "node:http";

process.env.VERCEL = "1";
process.env.ADMIN_USERNAME = "test-admin";
process.env.ADMIN_PASSWORD = "test-password";
process.env.SESSION_SECRET = "test-session-secret-with-enough-random-text";
delete process.env.DATABASE_URL;
delete process.env.BLOB_READ_WRITE_TOKEN;

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

try {
  const loginResponse = await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "test-admin", password: "test-password" }),
  });
  assert.equal(loginResponse.status, 200);
  const cookie = loginResponse.headers.get("set-cookie").split(";")[0];

  const submissionsResponse = await fetch(`${baseUrl}/api/admin/submissions`, {
    headers: { Cookie: cookie },
  });
  assert.equal(submissionsResponse.status, 200);
  const result = await submissionsResponse.json();
  assert.deepEqual(result.submissions, []);
  assert.match(result.setupRequired, /Connect Neon/);

  console.log("Vercel admin setup test passed.");
} finally {
  await new Promise((resolve) => server.close(resolve));
}
