import assert from "node:assert/strict";
import { test } from "node:test";
import { loadWinners } from "../src/data.ts";
import { DemoUnavailableError, loadDemo } from "../src/demo.ts";
import type { Angle } from "../src/schema.ts";

const w01 = async () => (await loadWinners()).find((w) => w.id === "W01")!;
const input = async (overrides: { count?: number; angles?: Angle[]; script?: string } = {}) => {
  const w = await w01();
  return { winnerId: w.id, script: overrides.script ?? w.script, count: overrides.count ?? 10, angles: overrides.angles ?? [], notes: "", lang: "en" as const };
};

test("returns the prepared variants for an unedited sample", async () => {
  const demo = await loadDemo(await input());
  assert.equal(demo.variants.length, 8);
  assert.ok(demo.warnings.some((w) => w.startsWith("Demo:")), "tells that live mode would return more");
});

test("refuses an edited script", async () => {
  await assert.rejects(loadDemo(await input({ script: "A completely different script about socks." })), DemoUnavailableError);
});

test("filters by angle and drops warnings tied to old positions", async () => {
  const demo = await loadDemo(await input({ angles: ["pain"] }));
  assert.ok(demo.variants.length > 0);
  assert.ok(demo.variants.every((v) => v.angle === "pain"));
  assert.ok(demo.warnings.every((w) => !/^H\d\d/.test(w)), "H01… numbering changes after filtering");
});

test("after slicing keeps only warnings about the variants shown", async () => {
  const demo = await loadDemo(await input({ count: 3 }));
  assert.equal(demo.variants.length, 3);
  for (const w of demo.warnings) {
    const ref = w.match(/^H(\d\d)/);
    if (ref) assert.ok(Number(ref[1]) <= 3, `unexpected warning: ${w}`);
  }
});
