import assert from "node:assert/strict";
import { test } from "node:test";
import { buildReport, normalizeLine } from "../src/report.ts";

const v = (first_line: string, angle = "pain") => ({ first_line, angle }) as never;

test("treats case and punctuation differences as the same hook", () => {
  assert.equal(normalizeLine("Where do they GO?!"), normalizeLine("where do they go"));
});

test("counts diversity across runs and usage from the log", () => {
  const runs = [{ variants: [v("One sock gone."), v("Exhibit A", "humor")] }, { variants: [v("one sock GONE"), v("New line")] }];
  const log = [
    JSON.stringify({ event: "generate", costUsd: 0.04 }),
    JSON.stringify({ event: "export", selected: 2 }),
    JSON.stringify({ event: "regenerate", costUsd: 0.02 }),
  ];
  const r = buildReport(runs, log);
  assert.equal(r.variants, 4);
  assert.equal(r.uniqueFirstLines, 3 / 4);
  assert.deepEqual(r.angles, { pain: 3, humor: 1 });
  assert.equal(r.exported, 2);
  assert.equal(r.regenerations, 1);
  assert.ok(Math.abs(r.costUsd - 0.06) < 1e-9);
});
