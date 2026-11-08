import path from "node:path";
import { fileURLToPath } from "node:url";

// Project root (the hooklab folder), so paths don't depend on where the script is started from.
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DATA_DIR = path.join(ROOT, "data");
export const WEB_DIST = path.join(ROOT, "web", "dist");
export const OUT_DIR = path.join(ROOT, "out");
export const RUNS_DIR = path.join(OUT_DIR, "runs");
export const LOG_FILE = path.join(OUT_DIR, "usage-log.jsonl");
