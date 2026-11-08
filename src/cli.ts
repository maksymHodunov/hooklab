import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { toBriefCsv } from "./csv.ts";
import { parseWinnerFile } from "./data.ts";
import { estimateGeneration } from "./estimate.ts";
import { generate, GenerationError, isLiveMode, validateInput } from "./generate.ts";
import { msg, normalizeLang } from "./i18n.ts";
import { MODELS } from "./models.ts";
import { OUT_DIR, ROOT } from "./paths.ts";
import { logEvent, saveRun } from "./store.ts";

try {
  process.loadEnvFile(path.join(ROOT, ".env"));
} catch {
  // no .env: demo mode or environment variables
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    count: { type: "string", default: "10" },
    angles: { type: "string", default: "" },
    notes: { type: "string", default: "" },
    id: { type: "string" },
    model: { type: "string", default: "" },
    lang: { type: "string", default: "" },
    out: { type: "string" },
  },
});

// Language of the CLI output and of the directions in the brief: --lang, then HOOKLAB_LANG, then English.
const lang = normalizeLang(values.lang || process.env.HOOKLAB_LANG);
const t = (key: string, params?: Record<string, string | number>) => msg(lang, key, params);

if (positionals.length === 0) {
  console.log(`${t("cliUsage")}: npm run cli -- <script-file> [--model sonnet|opus|sol|astra] [--count 1–30] [--angles pain,humor] [--notes "..."] [--lang en|uk] [--id W01] [--out brief.csv]

${t("cliModels")}: ${MODELS.map((m) => `${m.id} (${m.label})`).join(", ")}
${t("cliExample")}: npm run cli -- data/winners/w01-laundry-monster.md --model opus --count 5`);
  process.exit(1);
}

try {
  const file = positionals[0];
  const winner = parseWinnerFile(await readFile(file, "utf8"), path.parse(file).name.toUpperCase());
  const input = validateInput({
    winnerId: values.id ?? winner.id,
    script: winner.script,
    count: values.count,
    angles: values.angles ? values.angles.split(",").map((a) => a.trim()) : [],
    notes: values.notes,
    model: values.model,
    lang,
  });

  const estimate = await estimateGeneration(input);
  const price = isLiveMode()
    ? t("cliEstimate", { low: estimate.lowUsd.toFixed(3), high: estimate.highUsd.toFixed(3) })
    : t("cliDemoFree");
  console.log(t("cliGenerating", { count: input.count, id: input.winnerId, model: input.model, price }));
  const run = await generate(input);
  await saveRun(run);
  await logEvent({
    event: "generate",
    source: "cli",
    runId: run.runId,
    mode: run.mode,
    lang,
    model: input.model,
    modelUsed: run.modelUsed,
    winnerId: run.winnerId,
    requested: input.count,
    returned: run.variants.length,
    ms: run.ms,
    costUsd: run.usage?.costUsd ?? 0,
    estimateUsd: run.estimate.expectedUsd,
    estimateRawUsd: run.estimate.rawUsd,
  });

  const via = run.provider ? `, ${run.provider}` : "";
  console.log(`\n${run.mode === "live" ? t("cliModeLive", { model: `${run.modelUsed}${via}` }) : t("cliModeDemo")}`);
  console.log(`${t("cliWhy")}: ${run.winner_analysis.why_it_won}`);
  console.log(`${t("cliKeep")}: ${run.winner_analysis.keep_unchanged}\n`);
  for (const v of run.variants) {
    console.log(`${v.mod_id}  [${v.angle}]`);
    console.log(`  ${t("cliVisual")}: ${v.hook_visual}`);
    console.log(`  ${t("cliFirstLine")}: "${v.first_line}"`);
    console.log(`  ${t("cliScreen")}: "${v.on_screen_text}"`);
    console.log(`  ${t("cliReason")}: ${v.why}\n`);
  }
  if (run.warnings.length > 0) console.log(`${t("cliWarnings")}:\n- ${run.warnings.join("\n- ")}\n`);

  const out = values.out ?? path.join(OUT_DIR, `brief-${run.winnerId}-${run.runId}.csv`);
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, toBriefCsv(run));
  const cost = run.usage?.costUsd != null ? ` · $${run.usage.costUsd.toFixed(4)}` : "";
  console.log(t("cliSaved", { path: out, secs: (run.ms / 1000).toFixed(1), cost }));
} catch (err) {
  console.error(err instanceof GenerationError ? `${t("cliError")}: ${err.text(lang)}` : err);
  process.exit(1);
}
