// Types and a tiny fetch wrapper for the HookLab API (src/server.ts).
export type Lang = "en" | "uk"

export interface ModelInfo {
  id: string
  label: string
  vendor: string
}

export interface Status {
  mode: "live" | "demo"
  models: ModelInfo[]
  defaultModel: string
  angles: string[]
  presets: string[]
}

export interface Winner {
  id: string
  title: Record<Lang, string>
  angle: string
  script: string
}

export interface Variant {
  id: string
  version: number
  mod_id: string
  angle: string
  hook_visual: string
  first_line: string
  on_screen_text: string
  why: string
}

export interface Usage {
  inputTokens: number
  outputTokens: number
  costUsd: number | null
}

export interface Run {
  runId: string
  mode: "live" | "demo"
  model: string | null
  modelUsed: string | null
  provider: string | null
  winnerId: string
  winner_analysis: { why_it_won: string; keep_unchanged: string }
  variants: Variant[]
  warnings: string[]
  usage: Usage | null
  estimate: { expectedUsd: number; rawUsd: number }
  ms: number
}

export interface Estimate {
  expectedUsd: number
  lowUsd: number
  highUsd: number
  calibratedRuns: number
}

export interface RegenerateResponse {
  variant: Variant
  warnings: string[]
  usage: Usage
  estimate: { expectedUsd: number; rawUsd: number }
  modelUsed: string
  provider: string | null
  ms: number
}

let currentLang: Lang = "en"
export function setApiLang(lang: Lang) {
  currentLang = lang
}

async function request(path: string, body?: unknown): Promise<Response> {
  const res = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    // The server answers errors in this language.
    headers: { "Content-Type": "application/json", "X-Hooklab-Lang": currentLang },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error || `HTTP ${res.status}`)
  }
  return res
}

export const api = {
  get: async <T>(path: string) => (await request(path)).json() as Promise<T>,
  post: async <T>(path: string, body: unknown) => (await request(path, body)).json() as Promise<T>,
  blob: async (path: string, body: unknown) => (await request(path, body)).blob(),
}

export const formatUsd = (usd: number) => (usd < 0.1 ? `$${usd.toFixed(3)}` : `$${usd.toFixed(2)}`)
