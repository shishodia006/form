import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const rootDir = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(rootDir, ".env.local") });

export const isVercel = Boolean(process.env.VERCEL);
export const hasDatabase = Boolean(process.env.DATABASE_URL);
export const hasBlobStorage = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
