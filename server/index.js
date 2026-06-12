import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(rootDir, ".env.local") });

const dataDir = path.join(rootDir, "data");
const uploadsDir = path.join(dataDir, "uploads");
const submissionsFile = path.join(dataDir, "submissions.json");
const distDir = path.join(rootDir, "dist");

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "0.0.0.0";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-this-password";
const SESSION_SECRET = process.env.SESSION_SECRET || "development-only-session-secret";
const isProduction = process.env.NODE_ENV === "production";
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 4;
const SESSION_TTL_SECONDS = 8 * 60 * 60;

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "15mb" }));
app.use((_request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

const loginAttempts = new Map();
const submissionAttempts = new Map();
let writeQueue = Promise.resolve();

await ensureStorage();

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function parseCookies(request) {
  return String(request.headers.cookie || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, pair) => {
      const separator = pair.indexOf("=");
      if (separator === -1) return cookies;
      cookies[pair.slice(0, separator)] = decodeURIComponent(pair.slice(separator + 1));
      return cookies;
    }, {});
}

function signSession(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function readSession(request) {
  const token = parseCookies(request).admin_session;
  if (!token) return null;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(encoded).digest("base64url");
  if (!safeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (payload.expiresAt < Date.now() || payload.username !== ADMIN_USERNAME) return null;
    return payload;
  } catch {
    return null;
  }
}

function requireAdmin(request, response, next) {
  const session = readSession(request);
  if (!session) {
    response.status(401).json({ ok: false, error: "Admin login required." });
    return;
  }
  request.admin = session;
  next();
}

function getClientKey(request) {
  return String(request.headers["x-forwarded-for"] || request.socket.remoteAddress || "unknown")
    .split(",")[0]
    .trim();
}

function sanitizeFileName(fileName) {
  return path
    .basename(String(fileName || "file"))
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

function sanitizeText(value, maxLength = 10000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function sanitizeList(value) {
  return Array.isArray(value) ? value.map((item) => sanitizeText(item, 100)).filter(Boolean).slice(0, 30) : [];
}

function normalizeFormData(input) {
  return {
    fullName: sanitizeText(input.fullName, 150),
    businessName: sanitizeText(input.businessName, 200),
    phone: sanitizeText(input.phone, 30),
    email: sanitizeText(input.email, 200),
    websiteType: sanitizeText(input.websiteType, 100),
    businessDescription: sanitizeText(input.businessDescription),
    targetAudience: sanitizeText(input.targetAudience),
    primaryGoal: sanitizeText(input.primaryGoal, 150),
    uniqueValue: sanitizeText(input.uniqueValue),
    tone: sanitizeList(input.tone),
    pages: sanitizeList(input.pages),
    features: sanitizeList(input.features),
    inspiration: sanitizeText(input.inspiration),
    brandStyle: sanitizeText(input.brandStyle, 150),
    primaryColor: sanitizeText(input.primaryColor, 20),
    hasLogo: sanitizeText(input.hasLogo, 100),
    designNotes: sanitizeText(input.designNotes),
    budget: sanitizeText(input.budget, 100),
    timeline: sanitizeText(input.timeline, 100),
    contentReady: sanitizeText(input.contentReady, 100),
    launchDate: sanitizeText(input.launchDate, 30),
    finalNotes: sanitizeText(input.finalNotes),
    termsAccepted: input.termsAccepted === true,
  };
}

function validateSubmission(formData, files) {
  const requiredFields = [
    "fullName",
    "businessName",
    "phone",
    "email",
    "websiteType",
    "businessDescription",
    "targetAudience",
    "primaryGoal",
    "brandStyle",
    "budget",
    "timeline",
  ];

  for (const field of requiredFields) {
    if (!formData[field]) throw new Error(`Required field is missing: ${field}`);
  }
  if (!formData.termsAccepted) throw new Error("Terms must be accepted.");
  if (!Array.isArray(files) || files.length > MAX_FILES) throw new Error("Too many uploaded files.");

  let totalBytes = 0;
  for (const file of files) {
    const size = Number(file.size || 0);
    if (!file.name || !file.data || size <= 0) throw new Error("An uploaded file is invalid.");
    if (size > MAX_FILE_BYTES) throw new Error("Each uploaded file must be 5 MB or smaller.");
    totalBytes += size;
  }
  if (totalBytes > MAX_TOTAL_BYTES) throw new Error("Total uploaded files must be 10 MB or smaller.");
}

async function ensureStorage() {
  await fs.mkdir(uploadsDir, { recursive: true });
  try {
    await fs.access(submissionsFile);
  } catch {
    await fs.writeFile(submissionsFile, "[]", "utf8");
  }
}

async function readSubmissions() {
  const content = await fs.readFile(submissionsFile, "utf8");
  return JSON.parse(content || "[]");
}

function updateSubmissions(updater) {
  const operation = writeQueue.then(async () => {
    const submissions = await readSubmissions();
    const result = await updater(submissions);
    const temporaryFile = `${submissionsFile}.tmp`;
    await fs.writeFile(temporaryFile, JSON.stringify(submissions, null, 2), "utf8");
    await fs.rename(temporaryFile, submissionsFile);
    return result;
  });
  writeQueue = operation.catch(() => {});
  return operation;
}

async function saveFiles(submissionId, files) {
  if (!files.length) return [];
  const submissionUploadDir = path.join(uploadsDir, submissionId);
  await fs.mkdir(submissionUploadDir, { recursive: true });

  const savedFiles = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const safeName = `${index + 1}-${sanitizeFileName(file.name)}`;
    const targetPath = path.join(submissionUploadDir, safeName);
    const bytes = Buffer.from(String(file.data), "base64");
    if (bytes.length > MAX_FILE_BYTES) throw new Error("Decoded file exceeds the 5 MB limit.");
    await fs.writeFile(targetPath, bytes);
    savedFiles.push({
      name: sanitizeText(file.name, 150),
      storedName: safeName,
      mimeType: sanitizeText(file.mimeType, 150) || "application/octet-stream",
      size: bytes.length,
      category: sanitizeText(file.category, 50) || "Project file",
    });
  }
  return savedFiles;
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "Website Intake API" });
});

app.post("/api/submissions", async (request, response) => {
  try {
    const clientKey = getClientKey(request);
    const currentWindow = submissionAttempts.get(clientKey);
    const now = Date.now();
    if (currentWindow && currentWindow.expiresAt > now && currentWindow.count >= 20) {
      response.status(429).json({ ok: false, error: "Too many submissions. Please try again later." });
      return;
    }
    submissionAttempts.set(clientKey, {
      count: currentWindow && currentWindow.expiresAt > now ? currentWindow.count + 1 : 1,
      expiresAt: currentWindow && currentWindow.expiresAt > now ? currentWindow.expiresAt : now + 60 * 60 * 1000,
    });

    const formData = normalizeFormData(request.body?.formData || {});
    const files = request.body?.files || [];
    validateSubmission(formData, files);

    const id = crypto.randomUUID();
    const savedFiles = await saveFiles(id, files);
    const submission = {
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "New",
      formData,
      files: savedFiles,
      meta: {
        sourceUrl: sanitizeText(request.body?.meta?.sourceUrl, 500),
        timezone: sanitizeText(request.body?.meta?.timezone, 100),
      },
    };

    await updateSubmissions((submissions) => {
      submissions.unshift(submission);
    });

    response.status(201).json({ ok: true, submissionId: id });
  } catch (error) {
    response.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not save submission.",
    });
  }
});

app.post("/api/admin/login", (request, response) => {
  const clientKey = getClientKey(request);
  const attempt = loginAttempts.get(clientKey) || { count: 0, blockedUntil: 0 };

  if (attempt.blockedUntil > Date.now()) {
    response.status(429).json({ ok: false, error: "Too many attempts. Try again in 15 minutes." });
    return;
  }

  const usernameMatches = safeEqual(request.body?.username || "", ADMIN_USERNAME);
  const passwordMatches = safeEqual(request.body?.password || "", ADMIN_PASSWORD);

  if (!usernameMatches || !passwordMatches) {
    const nextCount = attempt.count + 1;
    loginAttempts.set(clientKey, {
      count: nextCount >= 5 ? 0 : nextCount,
      blockedUntil: nextCount >= 5 ? Date.now() + 15 * 60 * 1000 : 0,
    });
    response.status(401).json({ ok: false, error: "Invalid username or password." });
    return;
  }

  loginAttempts.delete(clientKey);
  const token = signSession({
    username: ADMIN_USERNAME,
    expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
  });

  response.setHeader(
    "Set-Cookie",
    `admin_session=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${SESSION_TTL_SECONDS}; SameSite=Strict${
      isProduction ? "; Secure" : ""
    }`,
  );
  response.json({ ok: true, username: ADMIN_USERNAME });
});

app.post("/api/admin/logout", (_request, response) => {
  response.setHeader(
    "Set-Cookie",
    `admin_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict${isProduction ? "; Secure" : ""}`,
  );
  response.json({ ok: true });
});

app.get("/api/admin/session", requireAdmin, (request, response) => {
  response.json({ ok: true, username: request.admin.username });
});

app.get("/api/admin/submissions", requireAdmin, async (_request, response) => {
  const submissions = await readSubmissions();
  response.json({ ok: true, submissions });
});

app.patch("/api/admin/submissions/:id", requireAdmin, async (request, response) => {
  const allowedStatuses = ["New", "Contacted", "In Progress", "Closed"];
  const status = sanitizeText(request.body?.status, 50);
  if (!allowedStatuses.includes(status)) {
    response.status(400).json({ ok: false, error: "Invalid status." });
    return;
  }

  const updated = await updateSubmissions((submissions) => {
    const submission = submissions.find((item) => item.id === request.params.id);
    if (!submission) return null;
    submission.status = status;
    submission.updatedAt = new Date().toISOString();
    return submission;
  });

  if (!updated) {
    response.status(404).json({ ok: false, error: "Submission not found." });
    return;
  }
  response.json({ ok: true, submission: updated });
});

app.get("/api/admin/files/:submissionId/:storedName", requireAdmin, async (request, response) => {
  const submissionId = path.basename(request.params.submissionId);
  const storedName = path.basename(request.params.storedName);
  const submissions = await readSubmissions();
  const submission = submissions.find((item) => item.id === submissionId);
  const file = submission?.files.find((item) => item.storedName === storedName);

  if (!file) {
    response.status(404).json({ ok: false, error: "File not found." });
    return;
  }

  const filePath = path.join(uploadsDir, submissionId, storedName);
  response.type(file.mimeType);
  response.setHeader("Content-Disposition", `inline; filename="${sanitizeFileName(file.name)}"`);
  response.sendFile(filePath);
});

if (await fs.stat(distDir).then(() => true).catch(() => false)) {
  app.use(express.static(distDir));
  app.get("*path", (_request, response) => {
    response.sendFile(path.join(distDir, "index.html"));
  });
}

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ ok: false, error: "Internal server error." });
});

app.listen(PORT, HOST, () => {
  console.log(`Website Intake API running at http://${HOST}:${PORT}`);
  if (ADMIN_PASSWORD === "change-this-password" || SESSION_SECRET === "development-only-session-secret") {
    console.warn("Set ADMIN_PASSWORD and SESSION_SECRET in .env.local before production use.");
  }
});
