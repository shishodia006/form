import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const rootDir = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(rootDir, ".env.local") });

function hasUsableDatabaseUrl(value) {
  const connectionString = String(value || "").trim();
  if (!connectionString) return false;

  try {
    const url = new URL(connectionString);
    const usesPostgres = ["postgres:", "postgresql:"].includes(url.protocol);
    const isExamplePlaceholder =
      url.username === "user" &&
      url.password === "password" &&
      url.hostname === "host" &&
      url.pathname === "/database";
    return usesPostgres && Boolean(url.hostname) && !isExamplePlaceholder;
  } catch {
    return false;
  }
}

export const isVercel = Boolean(process.env.VERCEL);
export const hasDatabase = hasUsableDatabaseUrl(process.env.DATABASE_URL);
export const hasBlobStorage = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
