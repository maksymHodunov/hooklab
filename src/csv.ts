import type { GenerationResult } from "./generate.ts";

const COLUMNS = [
  "mod_id",
  "winner_id",
  "angle",
  "hook_visual",
  "first_line",
  "on_screen_text",
  "why",
  "keep_unchanged",
  "run_id",
  "mode",
  "created_at",
];

const escape = (value: string) => (/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

// Brief for designers: one row = one modification. The BOM makes Excel show non-Latin text correctly.
export function toBriefCsv(run: GenerationResult, selectedIds: string[] = []): string {
  const chosen = selectedIds.length > 0 ? run.variants.filter((v) => selectedIds.includes(v.id)) : run.variants;
  const rows = chosen.map((v) => [
    v.mod_id,
    run.winnerId,
    v.angle,
    v.hook_visual,
    v.first_line,
    v.on_screen_text,
    v.why,
    run.winner_analysis.keep_unchanged,
    run.runId,
    run.mode,
    run.createdAt,
  ]);
  return "﻿" + [COLUMNS, ...rows].map((row) => row.map(escape).join(",")).join("\r\n") + "\r\n";
}
