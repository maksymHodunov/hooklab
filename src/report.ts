import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { GenerationResult } from "./generate.ts";
import { LOG_FILE, RUNS_DIR } from "./paths.ts";

// Usage metrics from out/: how much was generated and used, and how diverse the hooks are.
// Run with `npm run report`.

export interface Report {
  runs: number;
  variants: number;
  uniqueFirstLines: number; // share 0..1 of distinct first lines across all runs
  angles: Record<string, number>;
  exported: number; // variants taken into a brief
  regenerations: number;
  costUsd: number;
}

// Lowercase and drop punctuation, so "Where do they GO?" and "where do they go" count as the same hook.
export const normalizeLine = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

export function buildReport(runs: Pick<GenerationResult, "variants">[], logLines: string[]): Report {
  const variants = runs.flatMap((r) => r.variants);
  const unique = new Set(variants.map((v) => normalizeLine(v.first_line)));
  const angles: Record<string, number> = {};
  for (const v of variants) angles[v.angle] = (angles[v.angle] ?? 0) + 1;

  let exported = 0;
  let regenerations = 0;
  let costUsd = 0;
  for (const line of logLines) {
    try {
      const e = JSON.parse(line);
      if (e.event === "export") exported += e.selected ?? 0;
      if (e.event === "regenerate") regenerations += 1;
      costUsd += e.costUsd ?? 0;
    } catch {
      // skip broken lines
    }
  }
  return {
    runs: runs.length,
    variants: variants.length,
    uniqueFirstLines: variants.length ? unique.size / variants.length : 1,
    angles,
    exported,
    regenerations,
    costUsd,
  };
}

async function main() {
  let files: string[] = [];
  try {
    files = (await readdir(RUNS_DIR)).filter((f) => f.endsWith(".json"));
  } catch {
    // no runs yet
  }
  const runs = await Promise.all(
    files.map(async (f) => JSON.parse(await readFile(path.join(RUNS_DIR, f), "utf8")) as GenerationResult),
  );
  const log = await readFile(LOG_FILE, "utf8").catch(() => "");
  const r = buildReport(runs, log.split("\n").filter(Boolean));
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  console.log(`Runs: ${r.runs}, variants: ${r.variants}`);
  console.log(`Unique first lines across runs: ${pct(r.uniqueFirstLines)}`);
  console.log(`Angles: ${Object.entries(r.angles).map(([a, n]) => `${a} ${pct(n / Math.max(r.variants, 1))}`).join(", ") || "—"}`);
  console.log(`Taken into briefs: ${r.exported} (${pct(r.exported / Math.max(r.variants, 1))} of generated)`);
  console.log(`Regenerations per variant taken: ${r.exported ? (r.regenerations / r.exported).toFixed(2) : "—"}`);
  console.log(`Total model cost: $${r.costUsd.toFixed(3)}`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
