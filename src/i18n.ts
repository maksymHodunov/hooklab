// Server-side messages in English and Ukrainian (errors and CLI output).
export const LANGS = ["en", "uk"] as const;
export type Lang = (typeof LANGS)[number];

export function normalizeLang(value: unknown, fallback: Lang = "en"): Lang {
  const v = typeof value === "string" ? value.toLowerCase().slice(0, 2) : "";
  return (LANGS as readonly string[]).includes(v) ? (v as Lang) : fallback;
}

type Params = Record<string, string | number>;
type Messages = Record<string, string>;

const en: Messages = {
  scriptTooShort: "Paste the winning script (at least a few sentences).",
  scriptTooLong: "The script is too long: 8000 characters max.",
  unknownModel: "Unknown model “{value}”. Available: {list}",
  noVariant: "Specify which variant to regenerate.",
  variantNotFound: "Variant {id} not found.",
  rewriteDemo: "Regeneration needs an OpenRouter key: in demo mode no model is called.",
  oldRun: "This run was created by an older version. Generate the variants again.",
  runNotFound: "Run not found. Generate the variants again.",
  demoUnavailable: "Demo mode only works with the three unedited examples. To generate for your own script, add OPENROUTER_API_KEY to .env.",
  demoFewer: "Demo: {n} prepared variants; live mode will return {count}.",
  demoNoAngles: "Demo: no prepared examples for the selected angles, showing all.",
  timeout: "The model did not respond within {min} min. Try again, with fewer variants, or with another model.",
  noConnection: "Can't reach OpenRouter. Check your internet connection.",
  emptyResponse: "OpenRouter returned an empty response. Try again.",
  refusal: "The model declined this script. Check the text or pick another model.",
  truncated: "The response was cut off. Try fewer variants.",
  notJson: "The model did not return JSON. Try again or pick another model.",
  badFormat: "The model returned an unexpected format. Try again or pick another model.",
  err401: "The OpenRouter key was rejected: check OPENROUTER_API_KEY in .env.",
  err402: "Your OpenRouter account is out of credits.",
  err404: "OpenRouter found no model or provider that supports structured outputs. {msg}",
  err408: "The model took too long. Try again.",
  err429: "Too many requests. Try again in a minute.",
  err400: "OpenRouter rejected the request: {msg}",
  errOther: "OpenRouter error ({status}): {msg}",
  tooLarge: "Request is too large.",
  badJson: "Invalid JSON.",
  notFound: "Not found",
  unknownError: "Unknown error",
  // CLI
  cliUsage: "Usage",
  cliModels: "Models",
  cliExample: "Example",
  cliGenerating: "Generating {count} variants for {id} ({model}), {price}…",
  cliEstimate: "estimated ${low}–{high}",
  cliDemoFree: "demo mode, no cost",
  cliModeLive: "Mode: live ({model})",
  cliModeDemo: "Mode: demo",
  cliWhy: "Why the winner works",
  cliKeep: "Keep unchanged",
  cliVisual: "Visual",
  cliFirstLine: "First line",
  cliScreen: "On-screen text",
  cliReason: "Why",
  cliWarnings: "Heads-up",
  cliSaved: "Brief saved: {path} · {secs} s{cost}",
  cliError: "Error",
  serverReady: "HookLab is running: http://localhost:{port} · {mode}",
  serverLive: "live mode via OpenRouter, default model {model}",
  serverDemo: "demo mode (no OPENROUTER_API_KEY)",
  serverNoBuild: "The web app is not built yet: run `npm run build` (or `npm start`).",
};

const uk: Messages = {
  scriptTooShort: "Вставте скрипт переможця (хоча б кілька речень).",
  scriptTooLong: "Скрипт задовгий: максимум 8000 символів.",
  unknownModel: "Невідома модель «{value}». Доступні: {list}",
  noVariant: "Не вказано, який варіант перегенерувати.",
  variantNotFound: "Варіант {id} не знайдено.",
  rewriteDemo: "Перегенерація працює лише з ключем OpenRouter: у демо-режимі модель не викликається.",
  oldRun: "Цей запуск створено старішою версією. Згенеруйте варіанти заново.",
  runNotFound: "Запуск не знайдено. Згенеруйте варіанти ще раз.",
  demoUnavailable: "Демо-режим працює лише з трьома прикладами без змін. Щоб генерувати для свого скрипту, додайте OPENROUTER_API_KEY у файл .env.",
  demoFewer: "Демо: підготовлених варіантів — {n}, у живому режимі їх буде {count}.",
  demoNoAngles: "Демо: для вибраних кутів немає підготовлених прикладів, показано всі.",
  timeout: "Модель не відповіла за {min} хв. Спробуйте ще раз, меншу кількість варіантів або іншу модель.",
  noConnection: "Немає з'єднання з OpenRouter. Перевірте інтернет.",
  emptyResponse: "OpenRouter повернув порожню відповідь. Спробуйте ще раз.",
  refusal: "Модель відмовилася генерувати для цього скрипту. Перевірте текст або виберіть іншу модель.",
  truncated: "Відповідь обрізалася. Спробуйте меншу кількість варіантів.",
  notJson: "Модель повернула не JSON. Спробуйте ще раз або виберіть іншу модель.",
  badFormat: "Модель повернула відповідь не в тому форматі. Спробуйте ще раз або виберіть іншу модель.",
  err401: "Ключ OpenRouter не підходить: перевірте OPENROUTER_API_KEY у файлі .env.",
  err402: "На рахунку OpenRouter закінчилися кредити.",
  err404: "OpenRouter не знайшов модель або провайдера з підтримкою structured outputs. {msg}",
  err408: "Модель не встигла відповісти. Спробуйте ще раз.",
  err429: "Забагато запитів. Спробуйте за хвилину.",
  err400: "OpenRouter відхилив запит: {msg}",
  errOther: "Помилка OpenRouter ({status}): {msg}",
  tooLarge: "Запит завеликий.",
  badJson: "Некоректний JSON.",
  notFound: "Не знайдено",
  unknownError: "Невідома помилка",
  cliUsage: "Використання",
  cliModels: "Моделі",
  cliExample: "Приклад",
  cliGenerating: "Генерую варіанти ({count}) для {id} ({model}), {price}…",
  cliEstimate: "орієнтовно ${low}–{high}",
  cliDemoFree: "демо-режим, без витрат",
  cliModeLive: "Режим: живий ({model})",
  cliModeDemo: "Режим: демо",
  cliWhy: "Чому переможець працює",
  cliKeep: "Лишаємо без змін",
  cliVisual: "Візуал",
  cliFirstLine: "Перша фраза",
  cliScreen: "Текст на екрані",
  cliReason: "Чому",
  cliWarnings: "Увага",
  cliSaved: "Бриф збережено: {path} · {secs} с{cost}",
  cliError: "Помилка",
  serverReady: "HookLab працює: http://localhost:{port} · {mode}",
  serverLive: "живий режим через OpenRouter, модель за замовчуванням {model}",
  serverDemo: "демо-режим (немає OPENROUTER_API_KEY)",
  serverNoBuild: "Вебзастосунок ще не зібрано: виконайте `npm run build` (або `npm start`).",
};

const MESSAGES: Record<Lang, Messages> = { en, uk };

export function msg(lang: Lang, key: string, params: Params = {}): string {
  const template = MESSAGES[lang][key] ?? MESSAGES.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ""));
}
