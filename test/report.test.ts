import assert from "node:assert/strict";
import { test } from "node:test";
import { buildReport, normalizeLine } from "../src/report.ts";

const v = (first_line: string, angle = "pain") => ({ first_line, angle }) as never;

test("treats case and punctuation differences as the same hook", () => {
  assert.equal(normalizeLine("Where do they GO?!"), normalizeLine("where do they go"));
});

test("counts usage from the log", () => {
  const runs = [
    { winnerId: "W01", variants: [v("One sock gone."), v("Exhibit A", "humor")] },
    { winnerId: "W02", variants: [v("Drawer chaos"), v("New line")] },
  ];
  const log = [
    JSON.stringify({ event: "generate", costUsd: 0.04 }),
    JSON.stringify({ event: "export", selected: 2 }),
    JSON.stringify({ event: "regenerate", costUsd: 0.02 }),
  ];
  const r = buildReport(runs, log);
  assert.equal(r.variants, 4);
  assert.deepEqual(r.angles, { pain: 3, humor: 1 });
  assert.equal(r.exported, 2);
  assert.equal(r.regenerations, 1);
  assert.ok(Math.abs(r.costUsd - 0.06) < 1e-9);
});

test("measures diversity within each winner, not across different winners", () => {
  const runs = [
    { winnerId: "W01", variants: [v("One sock gone."), v("Exhibit A")] },
    { winnerId: "W01", variants: [v("one sock GONE"), v("Fresh take")] }, // repeats a W01 hook
    { winnerId: "W02", variants: [v("One sock gone."), v("Drawer chaos")] }, // same line, other winner: not a repeat
  ];
  const r = buildReport(runs, []);
  assert.equal(r.uniqueWithinWinner, 3 / 4, "only W01 has 2+ runs; 3 of its 4 lines are unique");
  assert.deepEqual(r.worstWinner, { winnerId: "W01", unique: 3 / 4 });
});

test("diversity is unknown until a winner has 2+ runs", () => {
  const r = buildReport([{ winnerId: "W01", variants: [v("A")] }, { winnerId: "W02", variants: [v("A")] }], []);
  assert.equal(r.uniqueWithinWinner, null);
});
