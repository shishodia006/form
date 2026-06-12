import app from "./app.js";

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "0.0.0.0";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-this-password";
const SESSION_SECRET = process.env.SESSION_SECRET || "development-only-session-secret";

app.listen(PORT, HOST, () => {
  console.log(`Website Intake API running at http://${HOST}:${PORT}`);
  if (ADMIN_PASSWORD === "change-this-password" || SESSION_SECRET === "development-only-session-secret") {
    console.warn("Set ADMIN_PASSWORD and SESSION_SECRET in .env.local before production use.");
  }
});
