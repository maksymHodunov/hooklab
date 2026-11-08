// Models available in the form and the CLI. IDs as in OpenRouter (https://openrouter.ai/models).
// To add a model, add an entry here.
export interface ModelOption {
  id: string;
  label: string;
  vendor: "Anthropic" | "OpenAI";
  pricing: { input: number; output: number }; // USD per 1M tokens
  // Cost-estimate calibration from test runs (W01–W03, 5–30 variants): output tokens = base + N × per variant.
  // After that the estimate corrects itself from actual run costs (see estimate.ts).
  estimate: {
    charsPerToken: number; // prompt characters per input token (including the response schema)
    outputBase: number; // output tokens that don't depend on the count: analysis, warnings, reasoning
    outputPerVariant: number; // tokens per variant
  };
}

export const MODELS: ModelOption[] = [
  {
    id: "anthropic/claude-sonnet-5.5",
    label: "Claude Sonnet 5.5",
    vendor: "Anthropic",
    pricing: { input: 2, output: 10 },
    estimate: { charsPerToken: 1.95, outputBase: 2080, outputPerVariant: 228 },
  },
  {
    id: "anthropic/claude-opus-5.5",
    label: "Claude Opus 5.5",
    vendor: "Anthropic",
    pricing: { input: 4, output: 20 },
    estimate: { charsPerToken: 1.95, outputBase: 1130, outputPerVariant: 280 },
  },
  {
    id: "openai/gpt-6.1-sol",
    label: "GPT-6.1 Sol",
    vendor: "OpenAI",
    pricing: { input: 2, output: 10 },
    estimate: { charsPerToken: 3.0, outputBase: 1310, outputPerVariant: 127 },
  },
  {
    id: "openai/gpt-6-astra",
    label: "GPT-6 Astra",
    vendor: "OpenAI",
    pricing: { input: 10, output: 50 },
    estimate: { charsPerToken: 2.95, outputBase: 570, outputPerVariant: 251 },
  },
];

export function getModel(id: string): ModelOption {
  return MODELS.find((m) => m.id === id) ?? MODELS[0];
}

// Read env at call time: .env is loaded after modules are imported.
export function defaultModel(): string {
  const fromEnv = process.env.HOOKLAB_DEFAULT_MODEL;
  return MODELS.some((m) => m.id === fromEnv) ? fromEnv! : MODELS[0].id;
}

// Accepts a full ID or a short name: "opus", "sonnet", "sol", "astra".
export function resolveModel(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") return defaultModel();
  const query = value.trim().toLowerCase();
  const exact = MODELS.find((m) => m.id === query);
  if (exact) return exact.id;
  const partial = MODELS.filter((m) => m.id.includes(query) || m.label.toLowerCase().includes(query));
  if (partial.length === 1) return partial[0].id;
  throw new Error(`Unknown model: ${value}`);
}
