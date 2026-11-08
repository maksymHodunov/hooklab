import assert from "node:assert/strict";
import { test } from "node:test";
import { toBriefCsv } from "../src/csv.ts";
import type { GenerationResult, Variant } from "../src/generate.ts";

const variant = (id: string, overrides: Partial<Variant> = {}): Variant => ({
  id,
  version: 1,
  mod_id: `W01-abc123-${id}`,
  angle: "humor",
  hook_visual: "Close-up of a washer",
  first_line: "Every laundry day, one sock disappears.",
  on_screen_text: "Where do they GO?",
  why: "Recognizable pain.",
  ...overrides,
});

const run = (variants: Variant[]): GenerationResult => ({
  runId: "abc123",
  createdAt: "2026-11-08T12:00:00.000Z",
  mode: "demo",
  model: null,
  modelUsed: null,
  provider: null,
  winnerId: "W01",
  request: { script: "…", count: variants.length, angles: [], notes: "", lang: "en" },
  winner_analysis: { why_it_won: "…", keep_unchanged: "Body and CTA" },
  variants,
  warnings: [],
  usage: null,
  estimate: { expectedUsd: 0, rawUsd: 0 },
  ms: 0,
});

const rows = (csv: string) => csv.replace(/^﻿/, "").trimEnd().split("\r\n");

test("starts with a BOM and a header row", () => {
  const csv = toBriefCsv(run([variant("H01")]));
  assert.ok(csv.startsWith("﻿"), "BOM lets Excel read non-Latin text");
  assert.equal(rows(csv)[0], "mod_id,winner_id,angle,hook_visual,first_line,on_screen_text,why,keep_unchanged,run_id,mode,created_at");
});

test("escapes commas, quotes and line breaks", () => {
  const csv = toBriefCsv(run([variant("H01", { first_line: 'She said "no", twice', why: "line one\nline two" })]));
  assert.ok(csv.includes('"She said ""no"", twice"'));
  assert.ok(csv.includes('"line one\nline two"'));
});

test("exports only selected variants, or all when nothing is selected", () => {
  const r = run([variant("H01"), variant("H02"), variant("H03")]);
  assert.equal(rows(toBriefCsv(r)).length, 1 + 3);
  const selected = rows(toBriefCsv(r, ["H02"]));
  assert.equal(selected.length, 1 + 1);
  assert.ok(selected[1].startsWith("W01-abc123-H02,"));
});
