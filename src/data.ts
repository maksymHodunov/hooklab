import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { DATA_DIR } from "./paths.ts";

export interface Winner {
  id: string;
  title: { en: string; uk: string };
  angle: string;
  script: string;
}

// Winner file: an optional header between "---" lines (id, title_en, title_uk, angle), then the script itself.
export function parseWinnerFile(text: string, fallbackId = "CUSTOM"): Winner {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  const meta: Record<string, string> = {};
  if (match) {
    for (const line of match[1].split("\n")) {
      const sep = line.indexOf(":");
      if (sep > 0) meta[line.slice(0, sep).trim()] = line.slice(sep + 1).trim();
    }
  }
  const id = meta.id || fallbackId;
  return {
    id,
    title: { en: meta.title_en || meta.title_uk || id, uk: meta.title_uk || meta.title_en || id },
    angle: meta.angle || "",
    script: (match ? text.slice(match[0].length) : text).trim(),
  };
}

export async function loadWinners(): Promise<Winner[]> {
  const dir = path.join(DATA_DIR, "winners");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".md")).sort();
  return Promise.all(
    files.map(async (f) => parseWinnerFile(await readFile(path.join(dir, f), "utf8"), path.parse(f).name)),
  );
}

export async function loadBrandGuide(): Promise<string> {
  return readFile(path.join(DATA_DIR, "brand.md"), "utf8");
}
