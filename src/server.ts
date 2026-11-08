import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { toBriefCsv } from "./csv.ts";
import { loadWinners } from "./data.ts";
import { estimateGeneration, estimateRewrite } from "./estimate.ts";
import {
  generate,
  GenerationError,
  isLiveMode,
  normalizeInput,
  rewriteVariant,
  validateInput,
  validateRewrite,
} from "./generate.ts";
import { msg, normalizeLang, type Lang } from "./i18n.ts";
import { defaultModel, MODELS, resolveModel } from "./models.ts";
import { ROOT, WEB_DIST } from "./paths.ts";
import { REWRITE_PRESETS } from "./prompt.ts";
import { ANGLES } from "./schema.ts";
import { getRun, logEvent, saveRun } from "./store.ts";

try {
  process.loadEnvFile(path.join(ROOT, ".env"));
} catch {
  // no .env: use environment variables or demo mode
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 100_000) throw new GenerationError("tooLarge", 413);
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw new GenerationError("badJson", 400);
  }
}

// Serves the built React app from web/dist. Paths outside the folder are rejected.
async function serveStatic(pathname: string, res: ServerResponse, lang: Lang): Promise<boolean> {
  const rel = pathname === "/" ? "index.html" : decodeURIComponent(pathname).replace(/^\/+/, "");
  const file = path.resolve(WEB_DIST, rel);
  if (!file.startsWith(WEB_DIST + path.sep)) return false;
  try {
    if (!(await stat(file)).isFile()) return false;
  } catch {
    if (pathname === "/") {
      res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(msg(lang, "serverNoBuild"));
      return true;
    }
    return false;
  }
  const cache = rel.startsWith("assets/") ? "public, max-age=31536000, immutable" : "no-cache";
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] ?? "application/octet-stream", "Cache-Control": cache });
  res.end(await readFile(file));
  return true;
}

async function handle(req: IncomingMessage, res: ServerResponse, lang: Lang) {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (req.method === "GET" && !url.pathname.startsWith("/api/")) {
    if (await serveStatic(url.pathname, res, lang)) return;
    sendJson(res, 404, { error: msg(lang, "notFound") });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/status") {
    sendJson(res, 200, {
      mode: isLiveMode() ? "live" : "demo",
      models: MODELS.map(({ id, label, vendor }) => ({ id, label, vendor })),
      defaultModel: defaultModel(),
      angles: ANGLES,
      presets: Object.keys(REWRITE_PRESETS),
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/winners") {
    sendJson(res, 200, await loadWinners());
    return;
  }

  // Cost estimate before a run: for the form (kind=generate) and for regenerating a variant (kind=regenerate).
  if (req.method === "POST" && url.pathname === "/api/estimate") {
    const body = await readJson(req);
    if (body.kind === "regenerate") {
      const run = await getRun(String(body.runId ?? ""));
      if (!run) throw new GenerationError("runNotFound", 404);
      let model: string;
      try {
        model = resolveModel(body.model);
      } catch {
        throw new GenerationError("unknownModel", 400, { value: String(body.model), list: MODELS.map((m) => m.id).join(", ") });
      }
      sendJson(res, 200, await estimateRewrite(model, run.request?.script ?? "", normalizeLang(body.lang, lang)));
    } else {
      sendJson(res, 200, await estimateGeneration(normalizeInput({ ...body, lang: body.lang ?? lang })));
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/generate") {
    const body = await readJson(req);
    const input = validateInput({ ...body, lang: body.lang ?? lang });
    const run = await generate(input);
    await saveRun(run);
    await logEvent({
      event: "generate",
      source: "web",
      runId: run.runId,
      mode: run.mode,
      lang: input.lang,
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
    sendJson(res, 200, run);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/regenerate") {
    const body = await readJson(req);
    const run = await getRun(String(body.runId ?? ""));
    if (!run) throw new GenerationError("runNotFound", 404);
    const request = validateRewrite({ ...body, lang: body.lang ?? lang });
    const result = await rewriteVariant(run, request);
    await saveRun(result.run);
    await logEvent({
      event: "regenerate",
      runId: run.runId,
      variantId: request.variantId,
      version: result.variant.version,
      presets: request.presets,
      hasNotes: request.notes.trim() !== "",
      model: request.model,
      modelUsed: result.modelUsed,
      ms: result.ms,
      costUsd: result.usage.costUsd ?? 0,
      estimateUsd: result.estimate.expectedUsd,
      estimateRawUsd: result.estimate.rawUsd,
    });
    sendJson(res, 200, {
      variant: result.variant,
      warnings: result.run.warnings,
      usage: result.usage,
      estimate: result.estimate,
      modelUsed: result.modelUsed,
      provider: result.provider,
      ms: result.ms,
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/export") {
    const body = await readJson(req);
    const run = await getRun(String(body.runId ?? ""));
    if (!run) throw new GenerationError("runNotFound", 404);
    const selected = Array.isArray(body.selectedIds) ? body.selectedIds.map(String) : [];
    const csv = toBriefCsv(run, selected);
    await logEvent({
      event: "export",
      runId: run.runId,
      winnerId: run.winnerId,
      selected: selected.length || run.variants.length,
      total: run.variants.length,
    });
    res.writeHead(200, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="brief-${run.winnerId}-${run.runId}.csv"`,
    });
    res.end(csv);
    return;
  }

  sendJson(res, 404, { error: msg(lang, "notFound") });
}

const server = createServer((req, res) => {
  // The web app sends its language in this header; errors come back in that language.
  const lang = normalizeLang(req.headers["x-hooklab-lang"]);
  handle(req, res, lang).catch((err: unknown) => {
    const status = err instanceof GenerationError ? err.status : 500;
    if (status >= 500) console.error(err);
    const message = err instanceof GenerationError ? err.text(lang) : msg(lang, "unknownError");
    sendJson(res, status, { error: message });
  });
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, () => {
  const lang = normalizeLang(process.env.HOOKLAB_LANG);
  const mode = isLiveMode() ? msg(lang, "serverLive", { model: defaultModel() }) : msg(lang, "serverDemo");
  console.log(msg(lang, "serverReady", { port, mode }));
});
