import crypto from "node:crypto";
import path from "node:path";
import { Readable } from "node:stream";
import fs from "node:fs/promises";
import express from "express";
import { handleUpload } from "@vercel/blob/client";
import { hasBlobStorage, isVercel, rootDir } from "./env.js";
import {
  createSubmission,
  findSubmission,
  getLocalFilePath,
  getPrivateBlob,
  listSubmissions,
  saveLocalFiles,
  updateSubmissionStatus,
  usesPersistentDatabase,
} from "./storage.js";

const distDir = path.join(rootDir, "dist");
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-this-password";
const SESSION_SECRET = process.env.SESSION_SECRET || "development-only-session-secret";
const isProduction = process.env.NODE_ENV === "production" || isVercel;
const productionAuthConfigured =
  !["change-this-password", "change-this-to-a-strong-password"].includes(ADMIN_PASSWORD) &&
  !["development-only-session-secret", "replace-with-a-long-random-secret"].includes(SESSION_SECRET);
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 4;
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const UPLOAD_TICKET_TTL_MS = 10 * 60 * 1000;

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

function signValue(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verifySignedValue(token) {
  const [encoded, signature] = String(token || "").split(".");
  if (!encoded || !signature) return null;

  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(encoded).digest("base64url");
  if (!safeEqual(signature, expected)) return null;

  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function readSession(request) {
  const payload = verifySignedValue(parseCookies(request).admin_session);
  if (!payload || payload.type !== "admin") return null;
  if (payload.expiresAt < Date.now() || payload.username !== ADMIN_USERNAME) return null;
  return payload;
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

function validateSubmission(formData, files, requireFileData = false) {
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
    if (!file.name || size <= 0 || (requireFileData && !file.data)) {
      throw new Error("An uploaded file is invalid.");
    }
    if (size > MAX_FILE_BYTES) throw new Error("Each uploaded file must be 5 MB or smaller.");
    totalBytes += size;
  }
  if (totalBytes > MAX_TOTAL_BYTES) throw new Error("Total uploaded files must be 10 MB or smaller.");
}

function validateSubmissionId(value) {
  const submissionId = sanitizeText(value, 100);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId)) {
    throw new Error("Submission ID is invalid.");
  }
  return submissionId;
}

function normalizeUploadDescriptors(submissionId, files) {
  return files.map((file, index) => {
    const storedName = `${index + 1}-${sanitizeFileName(file.name)}`;
    return {
      name: sanitizeText(file.name, 150),
      storedName,
      pathname: `website-intake/${submissionId}/${storedName}`,
      mimeType: sanitizeText(file.mimeType, 150) || "application/octet-stream",
      size: Number(file.size || 0),
      category: sanitizeText(file.category, 50) || "Project file",
    };
  });
}

function readUploadTicket(token) {
  const ticket = verifySignedValue(token);
  if (!ticket || ticket.type !== "upload" || ticket.expiresAt < Date.now()) {
    throw new Error("Upload authorization expired. Please submit the form again.");
  }
  return ticket;
}

function checkSubmissionRateLimit(request) {
  const clientKey = getClientKey(request);
  const currentWindow = submissionAttempts.get(clientKey);
  const now = Date.now();
  if (currentWindow && currentWindow.expiresAt > now && currentWindow.count >= 20) {
    throw new Error("Too many submissions. Please try again later.");
  }
  submissionAttempts.set(clientKey, {
    count: currentWindow && currentWindow.expiresAt > now ? currentWindow.count + 1 : 1,
    expiresAt: currentWindow && currentWindow.expiresAt > now ? currentWindow.expiresAt : now + 60 * 60 * 1000,
  });
}

function requireVercelDatabase() {
  if (isVercel && !productionAuthConfigured) {
    const error = new Error("Server security is not configured yet. Add ADMIN_PASSWORD and SESSION_SECRET in Vercel.");
    error.status = 503;
    throw error;
  }
  if (isVercel && !usesPersistentDatabase()) {
    const error = new Error("Server storage is not configured yet. Add DATABASE_URL in Vercel.");
    error.status = 503;
    throw error;
  }
}

function normalizeBlobFiles(files, ticket) {
  if (!ticket || !Array.isArray(ticket.files)) {
    throw new Error("Upload authorization is invalid.");
  }
  if (!Array.isArray(files) || files.length !== ticket.files.length) {
    throw new Error("One or more authorized files were not uploaded.");
  }

  const seenPaths = new Set();
  return files.map((file) => {
    const descriptor = ticket.files.find((item) => item.pathname === file.pathname);
    if (!descriptor || descriptor.storedName !== file.storedName || seenPaths.has(file.pathname)) {
      throw new Error("Uploaded file details do not match the authorization.");
    }
    seenPaths.add(file.pathname);
    return {
      name: descriptor.name,
      storedName: descriptor.storedName,
      pathname: descriptor.pathname,
      blobUrl: sanitizeText(file.blobUrl, 1000),
      mimeType: descriptor.mimeType,
      size: descriptor.size,
      category: descriptor.category,
    };
  });
}

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    service: "Website Intake API",
    database: usesPersistentDatabase() ? "postgres" : "local",
    uploads: hasBlobStorage ? "blob" : "local",
    securityConfigured: productionAuthConfigured,
  });
});

app.post("/api/uploads/authorize", (request, response) => {
  try {
    requireVercelDatabase();
    const submissionId = validateSubmissionId(request.body?.submissionId);
    const formData = normalizeFormData(request.body?.formData || {});
    const descriptors = normalizeUploadDescriptors(submissionId, request.body?.files || []);
    validateSubmission(formData, descriptors);

    if (!descriptors.length) {
      response.json({ ok: true, mode: "none", uploads: [] });
      return;
    }
    if (!hasBlobStorage) {
      if (isVercel) {
        response.status(503).json({
          ok: false,
          error: "File storage is not configured yet. Connect a private Vercel Blob store.",
        });
        return;
      }
      response.json({ ok: true, mode: "local" });
      return;
    }

    const ticket = signValue({
      type: "upload",
      submissionId,
      expiresAt: Date.now() + UPLOAD_TICKET_TTL_MS,
      files: descriptors,
    });
    response.json({ ok: true, mode: "blob", ticket, uploads: descriptors });
  } catch (error) {
    response.status(error.status || 400).json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not authorize uploads.",
    });
  }
});

app.post("/api/uploads", async (request, response) => {
  if (!hasBlobStorage) {
    response.status(503).json({ ok: false, error: "Vercel Blob is not configured." });
    return;
  }

  try {
    const result = await handleUpload({
      body: request.body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = JSON.parse(clientPayload || "{}");
        const ticket = readUploadTicket(payload.ticket);
        const descriptor = ticket.files.find((file) => file.pathname === pathname);
        if (!descriptor) throw new Error("This upload path is not authorized.");

        return {
          allowedContentTypes: [descriptor.mimeType],
          maximumSizeInBytes: descriptor.size,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ submissionId: ticket.submissionId }),
        };
      },
      onUploadCompleted: async () => {},
    });
    response.json(result);
  } catch (error) {
    response.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not upload file.",
    });
  }
});

app.post("/api/submissions", async (request, response) => {
  try {
    requireVercelDatabase();
    checkSubmissionRateLimit(request);

    const formData = normalizeFormData(request.body?.formData || {});
    const files = request.body?.files || [];
    const submissionId = request.body?.submissionId
      ? validateSubmissionId(request.body.submissionId)
      : crypto.randomUUID();
    let savedFiles;

    if (request.body?.uploadTicket) {
      const ticket = readUploadTicket(request.body.uploadTicket);
      if (ticket.submissionId !== submissionId) throw new Error("Upload authorization does not match this form.");
      validateSubmission(formData, ticket.files);
      savedFiles = normalizeBlobFiles(files, ticket);
    } else {
      validateSubmission(formData, files, files.length > 0);
      if (isVercel && files.length) {
        throw new Error("Files must be uploaded through the secure upload service.");
      }
      savedFiles = await saveLocalFiles(submissionId, files, sanitizeFileName);
      if (!files.length) savedFiles = [];
    }

    const now = new Date().toISOString();
    const submission = {
      id: submissionId,
      createdAt: now,
      updatedAt: now,
      status: "New",
      formData,
      files: savedFiles,
      meta: {
        sourceUrl: sanitizeText(request.body?.meta?.sourceUrl, 500),
        timezone: sanitizeText(request.body?.meta?.timezone, 100),
      },
    };

    await createSubmission(submission);
    response.status(201).json({ ok: true, submissionId });
  } catch (error) {
    const duplicate = error?.code === "23505" || String(error?.message || "").includes("already saved");
    response.status(duplicate ? 409 : error.status || 400).json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not save submission.",
    });
  }
});

app.post("/api/admin/login", (request, response) => {
  if (isVercel && !productionAuthConfigured) {
    response.status(503).json({
      ok: false,
      error: "Admin security is not configured yet. Add ADMIN_PASSWORD and SESSION_SECRET in Vercel.",
    });
    return;
  }

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
  const token = signValue({
    type: "admin",
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

app.get("/api/admin/submissions", requireAdmin, async (_request, response, next) => {
  try {
    requireVercelDatabase();
    response.json({ ok: true, submissions: await listSubmissions() });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/submissions/:id", requireAdmin, async (request, response, next) => {
  try {
    requireVercelDatabase();
    const allowedStatuses = ["New", "Contacted", "In Progress", "Closed"];
    const status = sanitizeText(request.body?.status, 50);
    if (!allowedStatuses.includes(status)) {
      response.status(400).json({ ok: false, error: "Invalid status." });
      return;
    }

    const updated = await updateSubmissionStatus(request.params.id, status, new Date().toISOString());
    if (!updated) {
      response.status(404).json({ ok: false, error: "Submission not found." });
      return;
    }
    response.json({ ok: true, submission: updated });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/files/:submissionId/:storedName", requireAdmin, async (request, response, next) => {
  try {
    requireVercelDatabase();
    const submissionId = path.basename(request.params.submissionId);
    const storedName = path.basename(request.params.storedName);
    const submission = await findSubmission(submissionId);
    const file = submission?.files.find((item) => item.storedName === storedName);

    if (!file) {
      response.status(404).json({ ok: false, error: "File not found." });
      return;
    }

    response.type(file.mimeType);
    response.setHeader("Content-Disposition", `inline; filename="${sanitizeFileName(file.name)}"`);

    if (file.pathname) {
      const blob = await getPrivateBlob(file.pathname);
      if (!blob || blob.statusCode !== 200) {
        response.status(404).json({ ok: false, error: "File not found." });
        return;
      }
      Readable.fromWeb(blob.stream).pipe(response);
      return;
    }

    response.sendFile(getLocalFilePath(submissionId, storedName));
  } catch (error) {
    next(error);
  }
});

if (!isVercel && (await fs.stat(distDir).then(() => true).catch(() => false))) {
  app.use(express.static(distDir));
  app.get("*path", (_request, response) => {
    response.sendFile(path.join(distDir, "index.html"));
  });
}

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(error.status || 500).json({
    ok: false,
    error: error.status ? error.message : "Internal server error.",
  });
});

export default app;
