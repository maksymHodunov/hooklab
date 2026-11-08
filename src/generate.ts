import { randomBytes } from "node:crypto";
import { z } from "zod";
import { loadBrandGuide } from "./data.ts";
import { DemoUnavailableError, loadDemo } from "./demo.ts";
import { estimateGeneration, estimateRewrite } from "./estimate.ts";
import { msg, normalizeLang, type Lang } from "./i18n.ts";
import { MODELS, resolveModel } from "./models.ts";
import {
  buildRewriteMessage,
  buildSystemPrompt,
  buildUserMessage,
  REWRITE_PRESETS,
  type PromptInput,
  type RewritePreset,
} from "./prompt.ts";
import { ANGLES, GenerationSchema, RewriteSchema, type Angle, type Generation, type VariantDraft } from "./schema.ts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
export const MAX_COUNT = 30;

export interface GenerateInput extends PromptInput {
  model: string;
  lang: Lang; // language of the directions (hook_visual, why, analysis, warnings)
}

export interface Variant extends VariantDraft {
  id: string; // H01, H02… within one run
  version: number; // 1, +1 after every regeneration
  mod_id: string; // W01-a1b2c3-H01 (or …-H01v2): goes into the creative name to match it with UA results later
}

type Usage = { inputTokens: number; outputTokens: number; costUsd: number | null };

export interface GenerationResult {
  runId: string;
  createdAt: string;
  mode: "live" | "demo";
  model: string | null; // the model that was picked
  modelUsed: string | null; // the model that actually answered (per OpenRouter)
  provider: string | null;
  winnerId: string;
  request: { script: string; count: number; angles: Angle[]; notes: string; lang: Lang };
  winner_analysis: Generation["winner_analysis"];
  variants: Variant[];
  warnings: string[];
  usage: Usage | null;
  estimate: { expectedUsd: number; rawUsd: number }; // cost estimate before the run: calibrated and raw
  ms: number;
}

// Errors carry a message key; the server/CLI renders them in the user's language.
export class GenerationError extends Error {
  constructor(
    readonly key: string,
    readonly status: number,
    readonly params: Record<string, string | number> = {},
  ) {
    super(msg("en", key, params));
  }
  text(lang: Lang): string {
    return msg(lang, this.key, this.params);
  }
}

export function isLiveMode(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY) && process.env.HOOKLAB_DEMO !== "1";
}

function pickModel(value: unknown): string {
  try {
    return resolveModel(value);
  } catch {
    throw new GenerationError("unknownModel", 400, { value: String(value), list: MODELS.map((m) => m.id).join(", ") });
  }
}

// Validates and normalizes input from the form or the CLI.
export function validateInput(raw: Partial<Record<keyof GenerateInput, unknown>>): GenerateInput {
  const input = normalizeInput(raw);
  if (input.script.length < 30) throw new GenerationError("scriptTooShort", 400);
  if (input.script.length > 8000) throw new GenerationError("scriptTooLong", 400);
  return input;
}

// Normalizes input without the length check: used for the cost estimate while the user is still typing.
export function normalizeInput(raw: Partial<Record<keyof GenerateInput, unknown>>): GenerateInput {
  const script = typeof raw.script === "string" ? raw.script.trim().slice(0, 8000) : "";
  const winnerId = typeof raw.winnerId === "string" && /^[A-Za-z0-9_-]{1,20}$/.test(raw.winnerId) ? raw.winnerId : "CUSTOM";
  const n = Math.round(Number(raw.count));
  const count = Number.isFinite(n) && n >= 1 ? Math.min(n, MAX_COUNT) : 10;
  const angles = Array.isArray(raw.angles)
    ? raw.angles.filter((a): a is Angle => (ANGLES as readonly string[]).includes(a))
    : [];
  const notes = typeof raw.notes === "string" ? raw.notes.slice(0, 500) : "";
  return { winnerId, script, count, angles, notes, model: pickModel(raw.model), lang: normalizeLang(raw.lang) };
}

// Generates a set of variants for a winner.
export async function generate(input: GenerateInput): Promise<GenerationResult> {
  const started = Date.now();
  const runId = randomBytes(3).toString("hex");
  const { expectedUsd, rawUsd } = await estimateGeneration(input);

  let generation: Generation;
  let meta: Pick<GenerationResult, "mode" | "modelUsed" | "provider" | "usage">;
  if (isLiveMode()) {
    // More variants means a longer answer: the token limit and timeout grow with the count.
    const res = await callModel(input.model, input.lang, buildUserMessage(input), GenerationSchema, "hook_variants", {
      maxTokens: Math.min(64_000, 6_000 + input.count * 1_500),
      timeoutMs: Math.max(180_000, input.count * 12_000),
    });
    generation = res.data;
    meta = { mode: "live", modelUsed: res.modelUsed, provider: res.provider, usage: res.usage };
  } else {
    try {
      generation = await loadDemo(input);
    } catch (err) {
      if (err instanceof DemoUnavailableError) throw new GenerationError("demoUnavailable", 400);
      throw err;
    }
    meta = { mode: "demo", modelUsed: null, provider: null, usage: null };
  }

  const variants = generation.variants.map((v, i) => {
    const id = `H${String(i + 1).padStart(2, "0")}`;
    return { ...v, id, version: 1, mod_id: `${input.winnerId}-${runId}-${id}` };
  });
  return {
    runId,
    createdAt: new Date().toISOString(),
    model: meta.mode === "live" ? input.model : null,
    ...meta,
    winnerId: input.winnerId,
    request: { script: input.script, count: input.count, angles: input.angles, notes: input.notes, lang: input.lang },
    winner_analysis: generation.winner_analysis,
    variants,
    warnings: generation.warnings,
    estimate: { expectedUsd, rawUsd },
    ms: Date.now() - started,
  };
}

export interface RewriteRequest {
  variantId: string;
  presets: RewritePreset[];
  notes: string;
  model: string;
  lang: Lang;
}

export function validateRewrite(raw: Record<string, unknown>): RewriteRequest {
  const variantId = typeof raw.variantId === "string" && /^H\d{2}$/.test(raw.variantId) ? raw.variantId : "";
  if (!variantId) throw new GenerationError("noVariant", 400);
  const presets = Array.isArray(raw.presets)
    ? raw.presets.filter((p): p is RewritePreset => typeof p === "string" && p in REWRITE_PRESETS)
    : [];
  const notes = typeof raw.notes === "string" ? raw.notes.slice(0, 500) : "";
  return { variantId, presets, notes, model: pickModel(raw.model), lang: normalizeLang(raw.lang) };
}

// Regenerates one variant from the designer's feedback and returns the updated run.
export async function rewriteVariant(
  run: GenerationResult,
  req: RewriteRequest,
): Promise<{
  run: GenerationResult;
  variant: Variant;
  usage: Usage;
  estimate: { expectedUsd: number; rawUsd: number };
  modelUsed: string;
  provider: string | null;
  ms: number;
}> {
  if (!isLiveMode()) {
    throw new GenerationError("rewriteDemo", 400);
  }
  if (!run.request?.script) throw new GenerationError("oldRun", 409);
  const index = run.variants.findIndex((v) => v.id === req.variantId);
  if (index === -1) throw new GenerationError("variantNotFound", 404, { id: req.variantId });

  const started = Date.now();
  const { expectedUsd, rawUsd } = await estimateRewrite(req.model, run.request.script, req.lang);
  const current = run.variants[index];
  const message = buildRewriteMessage({
    winnerId: run.winnerId,
    script: run.request.script,
    variantId: current.id,
    current,
    otherFirstLines: run.variants.filter((v) => v.id !== current.id).map((v) => v.first_line),
    presets: req.presets,
    notes: req.notes,
  });
  const res = await callModel(req.model, req.lang, message, RewriteSchema, "hook_rewrite", { maxTokens: 16_000, timeoutMs: 180_000 });

  const version = (current.version ?? 1) + 1;
  const variant: Variant = {
    ...res.data.variant,
    id: current.id,
    version,
    mod_id: `${run.winnerId}-${run.runId}-${current.id}v${version}`,
  };
  // Old warnings about this variant no longer apply: replace them with new ones.
  const mentions = new RegExp(`\\b${current.id}\\b`);
  const warnings = [...run.warnings.filter((w) => !mentions.test(w)), ...res.data.warnings];
  const variants = run.variants.map((v, i) => (i === index ? variant : v));

  return {
    run: { ...run, variants, warnings },
    variant,
    usage: res.usage,
    estimate: { expectedUsd, rawUsd },
    modelUsed: res.modelUsed,
    provider: res.provider,
    ms: Date.now() - started,
  };
}

// Minimal shape of an OpenRouter response (OpenAI Chat Completions format).
interface OpenRouterResponse {
  model?: string;
  provider?: string;
  error?: { message?: string; code?: number };
  choices?: { finish_reason?: string; message?: { content?: string | null; refusal?: string | null } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
}

// One model call via OpenRouter with structured output from a zod schema.
async function callModel<T>(
  model: string,
  lang: Lang,
  userMessage: string,
  schema: z.ZodType<T>,
  schemaName: string,
  limits: { maxTokens: number; timeoutMs: number },
): Promise<{ data: T; modelUsed: string; provider: string | null; usage: Usage }> {
  // The JSON Schema for structured outputs is generated from the same zod schema that validates the answer.
  const { $schema: _ignored, ...jsonSchema } = z.toJSONSchema(schema);
  const system = buildSystemPrompt(await loadBrandGuide(), lang);

  let res: Response;
  try {
    res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "X-Title": "HookLab", // app name in OpenRouter stats
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMessage },
        ],
        // Structured outputs: the model must return JSON matching our schema.
        response_format: { type: "json_schema", json_schema: { name: schemaName, strict: true, schema: jsonSchema } },
        // Route only to providers that support response_format.
        provider: { require_parameters: true },
        max_tokens: limits.maxTokens,
        usage: { include: true }, // return the request cost
      }),
      signal: AbortSignal.timeout(limits.timeoutMs),
    });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    const minutes = Math.round(limits.timeoutMs / 60_000);
    throw timedOut ? new GenerationError("timeout", 504, { min: minutes }) : new GenerationError("noConnection", 503);
  }

  const data = (await res.json().catch(() => null)) as OpenRouterResponse | null;
  if (!res.ok || !data || data.error) throw toGenerationError(res.status, data?.error?.message);

  const choice = data.choices?.[0];
  if (!choice) throw new GenerationError("emptyResponse", 502);
  if (choice.message?.refusal || choice.finish_reason === "content_filter") {
    throw new GenerationError("refusal", 422);
  }
  if (choice.finish_reason === "length") {
    throw new GenerationError("truncated", 502);
  }

  return {
    data: parseJson(choice.message?.content, schema),
    modelUsed: data.model ?? model,
    provider: data.provider ?? null,
    usage: {
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
      costUsd: data.usage?.cost ?? null,
    },
  };
}

// Parse the JSON and validate it with zod again: providers differ in how strictly they honor the schema.
function parseJson<T>(content: string | null | undefined, schema: z.ZodType<T>): T {
  const text = (content ?? "").trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new GenerationError("notJson", 502);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new GenerationError("badFormat", 502);
  }
  return parsed.data;
}

// OpenRouter error codes: https://openrouter.ai/docs/api-reference/errors
function toGenerationError(status: number, message = ""): GenerationError {
  switch (status) {
    case 401:
      return new GenerationError("err401", 401);
    case 402:
      return new GenerationError("err402", 402);
    case 404:
      return new GenerationError("err404", 404, { msg: message });
    case 408:
      return new GenerationError("err408", 504);
    case 429:
      return new GenerationError("err429", 429);
    case 400:
      return new GenerationError("err400", 400, { msg: message });
    default:
      return new GenerationError("errOther", 502, { status, msg: message || "unknown error" });
  }
}
