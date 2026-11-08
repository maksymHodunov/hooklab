import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadWinners } from "./data.ts";
import { msg, type Lang } from "./i18n.ts";
import { DATA_DIR } from "./paths.ts";
import { GenerationSchema, type Generation } from "./schema.ts";
import type { PromptInput } from "./prompt.ts";

export class DemoUnavailableError extends Error {}

const normalize = (s: string) => s.replace(/\s+/g, " ").trim();

// Demo mode: without an API key, return prepared examples for the three sample winners.
// Like live results, they are in the language of the script (the samples are in English).
export async function loadDemo(input: PromptInput & { lang: Lang }): Promise<Generation> {
  const winners = await loadWinners();
  const sample = winners.find((w) => w.id === input.winnerId && normalize(w.script) === normalize(input.script));
  if (!sample) throw new DemoUnavailableError();

  const file = path.join(DATA_DIR, "demo", `${sample.id.toLowerCase()}.json`);
  const demo = GenerationSchema.parse(JSON.parse(await readFile(file, "utf8")));
  const notes: string[] = [];

  // Filter the prepared variants by the selected angles so the demo reacts to the form.
  let variants = demo.variants;
  let filtered = false;
  if (input.angles.length > 0) {
    const byAngle = variants.filter((v) => input.angles.includes(v.angle));
    if (byAngle.length > 0) {
      variants = byAngle;
      filtered = byAngle.length < demo.variants.length;
    } else {
      notes.push(msg(input.lang, "demoNoAngles"));
    }
  }
  if (variants.length < input.count) {
    notes.push(msg(input.lang, "demoFewer", { n: variants.length, count: input.count }));
  }
  variants = variants.slice(0, input.count);

  // Warnings refer to positions H01… in the full list. After filtering the numbering changes,
  // so such warnings are dropped; after slicing, only those about shown variants are kept.
  const warnings = demo.warnings.filter((w) => {
    const ref = w.match(/^H(\d\d)/);
    if (!ref) return true;
    return !filtered && Number(ref[1]) <= variants.length;
  });
  return { ...demo, variants, warnings: [...warnings, ...notes] };
}
