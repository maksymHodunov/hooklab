import { readFile } from "node:fs/promises";
import { loadBrandGuide } from "./data.ts";
import { getModel, type ModelOption } from "./models.ts";
import { LOG_FILE } from "./paths.ts";
import { buildSystemPrompt, buildUserMessage, type PromptInput } from "./prompt.ts";

export type EstimateKind = "generate" | "regenerate";

export interface Estimate {
  kind: EstimateKind;
  model: string;
  inputTokens: number;
  outputTokens: number;
  rawUsd: number; // estimate from tokens and price only
  expectedUsd: number; // corrected by actual runs of this model
  lowUsd: number;
  highUsd: number;
  calibratedRuns: number; // how many actual runs the correction is based on
}

// The rewrite prompt holds the current variant, other variants' first lines and the feedback: ~2,300 chars on top of the script.
const REWRITE_EXTRA_CHARS = 2300;

// Cost estimate for generating a set of variants, before calling the model.
export async function estimateGeneration(input: PromptInput & { model: string }): Promise<Estimate> {
  const m = getModel(input.model);
  const chars = buildSystemPrompt(await loadBrandGuide()).length + buildUserMessage(input).length;
  const outputTokens = m.estimate.outputBase + input.count * m.estimate.outputPerVariant;
  return finish("generate", m, chars, outputTokens);
}

// Cost estimate for regenerating one variant.
export async function estimateRewrite(model: string, script: string): Promise<Estimate> {
  const m = getModel(model);
  const chars = buildSystemPrompt(await loadBrandGuide()).length + script.length + REWRITE_EXTRA_CHARS;
  // Without the winner analysis the model writes and reasons less: in tests ~a quarter of the base plus one variant.
  const outputTokens = Math.round(m.estimate.outputBase * 0.25) + m.estimate.outputPerVariant;
  return finish("regenerate", m, chars, outputTokens);
}

async function finish(kind: EstimateKind, m: ModelOption, promptChars: number, outputTokens: number): Promise<Estimate> {
  const inputTokens = Math.round(promptChars / m.estimate.charsPerToken);
  const rawUsd = (inputTokens * m.pricing.input + outputTokens * m.pricing.output) / 1_000_000;
  const { factor, runs } = await calibration(kind, m.id);
  const expectedUsd = rawUsd * factor;
  // Range: models write different amounts of text and reasoning from run to run.
  return {
    kind,
    model: m.id,
    inputTokens,
    outputTokens,
    rawUsd,
    expectedUsd,
    lowUsd: expectedUsd * 0.75,
    highUsd: expectedUsd * 1.35,
    calibratedRuns: runs,
  };
}

// Self-calibration: take the last 10 live runs of this model from the log,
// see how far the actual cost was from the estimate, and multiply the estimate by the median ratio.
async function calibration(kind: EstimateKind, model: string): Promise<{ factor: number; runs: number }> {
  let log = "";
  try {
    log = await readFile(LOG_FILE, "utf8");
  } catch {
    return { factor: 1, runs: 0 };
  }
  return calibrationFactor(log, kind, model);
}

// Pure part of the calibration, so it can be tested without a log file.
export function calibrationFactor(log: string, kind: EstimateKind, model: string): { factor: number; runs: number } {
  const ratios = log
    .split("\n")
    .flatMap((line) => {
      try {
        const e = JSON.parse(line);
        return e.event === kind && e.model === model && e.costUsd > 0 && e.estimateRawUsd > 0 ? [e.costUsd / e.estimateRawUsd] : [];
      } catch {
        return [];
      }
    })
    .slice(-10)
    .sort((a, b) => a - b);
  if (ratios.length === 0) return { factor: 1, runs: 0 };
  const median = ratios[Math.floor(ratios.length / 2)];
  return { factor: Math.min(Math.max(median, 0.5), 2), runs: ratios.length };
}
