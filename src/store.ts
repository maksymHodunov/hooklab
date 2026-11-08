import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { GenerationResult } from "./generate.ts";
import { LOG_FILE, OUT_DIR, RUNS_DIR } from "./paths.ts";

const runs = new Map<string, GenerationResult>();

// Every run is saved to out/runs/<runId>.json: this is what later links a hook to its results.
export async function saveRun(run: GenerationResult): Promise<void> {
  runs.set(run.runId, run);
  await mkdir(RUNS_DIR, { recursive: true });
  await writeFile(path.join(RUNS_DIR, `${run.runId}.json`), JSON.stringify(run, null, 2));
}

export async function getRun(runId: string): Promise<GenerationResult | undefined> {
  if (!/^[0-9a-f]{6}$/.test(runId)) return undefined;
  const cached = runs.get(runId);
  if (cached) return cached;
  try {
    return JSON.parse(await readFile(path.join(RUNS_DIR, `${runId}.json`), "utf8")) as GenerationResult;
  } catch {
    return undefined;
  }
}

// Event log for metrics: how much was generated, how much was used, what it cost.
export async function logEvent(event: Record<string, unknown>): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  await appendFile(LOG_FILE, JSON.stringify({ ts: new Date().toISOString(), ...event }) + "\n");
}
