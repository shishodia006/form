import fs from "node:fs/promises";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { get } from "@vercel/blob";
import { hasDatabase, rootDir } from "./env.js";

const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(rootDir, "data");
const uploadsDir = path.join(dataDir, "uploads");
const submissionsFile = path.join(dataDir, "submissions.json");

let localWriteQueue = Promise.resolve();
let databaseReady;

function database() {
  if (!hasDatabase) return null;
  return neon(process.env.DATABASE_URL);
}

async function ensureDatabase() {
  if (!hasDatabase) return;
  if (!databaseReady) {
    const sql = database();
    databaseReady = sql`
      CREATE TABLE IF NOT EXISTS website_intake_submissions (
        id UUID PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        status TEXT NOT NULL,
        form_data JSONB NOT NULL,
        files JSONB NOT NULL DEFAULT '[]'::jsonb,
        meta JSONB NOT NULL DEFAULT '{}'::jsonb
      )
    `.catch((error) => {
      databaseReady = null;
      throw error;
    });
  }
  await databaseReady;
}

async function ensureLocalStorage() {
  await fs.mkdir(uploadsDir, { recursive: true });
  try {
    await fs.access(submissionsFile);
  } catch {
    await fs.writeFile(submissionsFile, "[]", "utf8");
  }
}

async function readLocalSubmissions() {
  await ensureLocalStorage();
  const content = await fs.readFile(submissionsFile, "utf8");
  return JSON.parse(content || "[]");
}

function updateLocalSubmissions(updater) {
  const operation = localWriteQueue.then(async () => {
    const submissions = await readLocalSubmissions();
    const result = await updater(submissions);
    const temporaryFile = `${submissionsFile}.tmp`;
    await fs.writeFile(temporaryFile, JSON.stringify(submissions, null, 2), "utf8");
    await fs.rename(temporaryFile, submissionsFile);
    return result;
  });
  localWriteQueue = operation.catch(() => {});
  return operation;
}

function mapDatabaseRow(row) {
  return {
    id: row.id,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    status: row.status,
    formData: row.form_data || {},
    files: row.files || [],
    meta: row.meta || {},
  };
}

export function usesPersistentDatabase() {
  return hasDatabase;
}

export async function createSubmission(submission) {
  if (!hasDatabase) {
    await updateLocalSubmissions((submissions) => {
      if (submissions.some((item) => item.id === submission.id)) {
        throw new Error("This submission was already saved.");
      }
      submissions.unshift(submission);
    });
    return submission;
  }

  await ensureDatabase();
  const sql = database();
  const rows = await sql`
    INSERT INTO website_intake_submissions (
      id,
      created_at,
      updated_at,
      status,
      form_data,
      files,
      meta
    )
    VALUES (
      ${submission.id},
      ${submission.createdAt},
      ${submission.updatedAt},
      ${submission.status},
      ${JSON.stringify(submission.formData)}::jsonb,
      ${JSON.stringify(submission.files)}::jsonb,
      ${JSON.stringify(submission.meta)}::jsonb
    )
    RETURNING *
  `;
  return mapDatabaseRow(rows[0]);
}

export async function listSubmissions() {
  if (!hasDatabase) return readLocalSubmissions();

  await ensureDatabase();
  const sql = database();
  const rows = await sql`
    SELECT *
    FROM website_intake_submissions
    ORDER BY created_at DESC
  `;
  return rows.map(mapDatabaseRow);
}

export async function findSubmission(id) {
  if (!hasDatabase) {
    const submissions = await readLocalSubmissions();
    return submissions.find((item) => item.id === id) || null;
  }

  await ensureDatabase();
  const sql = database();
  const rows = await sql`
    SELECT *
    FROM website_intake_submissions
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] ? mapDatabaseRow(rows[0]) : null;
}

export async function updateSubmissionStatus(id, status, updatedAt) {
  if (!hasDatabase) {
    return updateLocalSubmissions((submissions) => {
      const submission = submissions.find((item) => item.id === id);
      if (!submission) return null;
      submission.status = status;
      submission.updatedAt = updatedAt;
      return submission;
    });
  }

  await ensureDatabase();
  const sql = database();
  const rows = await sql`
    UPDATE website_intake_submissions
    SET status = ${status}, updated_at = ${updatedAt}
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? mapDatabaseRow(rows[0]) : null;
}

export async function saveLocalFiles(submissionId, files, sanitizeFileName) {
  if (!files.length) return [];

  await ensureLocalStorage();
  const submissionUploadDir = path.join(uploadsDir, submissionId);
  await fs.mkdir(submissionUploadDir, { recursive: true });

  const savedFiles = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const storedName = `${index + 1}-${sanitizeFileName(file.name)}`;
    const bytes = Buffer.from(String(file.data), "base64");
    if (bytes.length > 5 * 1024 * 1024) {
      throw new Error("Decoded file exceeds the 5 MB limit.");
    }
    const targetPath = path.join(submissionUploadDir, storedName);
    await fs.writeFile(targetPath, bytes);
    savedFiles.push({
      name: file.name,
      storedName,
      mimeType: file.mimeType || "application/octet-stream",
      size: bytes.length,
      category: file.category || "Project file",
    });
  }
  return savedFiles;
}

export function getLocalFilePath(submissionId, storedName) {
  return path.join(uploadsDir, path.basename(submissionId), path.basename(storedName));
}

export function getPrivateBlob(pathname) {
  return get(pathname, { access: "private" });
}
