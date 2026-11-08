import assert from "node:assert/strict";
import { test } from "node:test";
import { calibrationFactor } from "../src/estimate.ts";

const MODEL = "anthropic/claude-sonnet-5.5";
const entry = (costUsd: number, estimateRawUsd: number, extra: Record<string, unknown> = {}) =>
  JSON.stringify({ event: "generate", model: MODEL, costUsd, estimateRawUsd, ...extra });

test("no history means no correction", () => {
  assert.deepEqual(calibrationFactor("", "generate", MODEL), { factor: 1, runs: 0 });
});

test("uses the median ratio of actual to estimated cost", () => {
  const log = [entry(0.08, 0.1), entry(0.12, 0.1), entry(0.09, 0.1)].join("\n");
  const { factor, runs } = calibrationFactor(log, "generate", MODEL);
  assert.equal(runs, 3);
  assert.ok(Math.abs(factor - 0.9) < 1e-9);
});

test("ignores other models, other events, demo runs and broken lines", () => {
  const log = [
    entry(0.2, 0.1, { model: "openai/gpt-6.1-sol" }),
    entry(0.2, 0.1, { event: "regenerate" }),
    entry(0, 0.1),
    "not json",
    entry(0.05, 0.1),
  ].join("\n");
  assert.deepEqual(calibrationFactor(log, "generate", MODEL), { factor: 0.5, runs: 1 });
});

test("clamps the factor to 0.5–2 and only looks at the last 10 runs", () => {
  const old = Array.from({ length: 10 }, () => entry(1, 0.1)); // ratio 10, would be clamped to 2
  const recent = Array.from({ length: 10 }, () => entry(0.11, 0.1));
  const { factor, runs } = calibrationFactor([...old, ...recent].join("\n"), "generate", MODEL);
  assert.equal(runs, 10);
  assert.ok(Math.abs(factor - 1.1) < 1e-9, "old runs are dropped");
  assert.equal(calibrationFactor(old.join("\n"), "generate", MODEL).factor, 2);
});
