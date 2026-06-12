import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vitePath = path.join(rootDir, "node_modules", "vite", "bin", "vite.js");

const processes = [
  spawn(process.execPath, [vitePath], {
    cwd: rootDir,
    stdio: "inherit",
    windowsHide: true,
  }),
  spawn(process.execPath, ["--watch", "server/index.js"], {
    cwd: rootDir,
    stdio: "inherit",
    windowsHide: true,
  }),
];

let stopping = false;

function stopAll(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of processes) {
    if (!child.killed) child.kill();
  }
  setTimeout(() => process.exit(exitCode), 100);
}

for (const child of processes) {
  child.on("exit", (code) => {
    if (!stopping && code && code !== 0) stopAll(code);
  });
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
