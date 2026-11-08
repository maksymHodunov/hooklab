import * as React from "react"

import { setApiLang, type Lang } from "@/lib/api"

// UI strings in English and Ukrainian. {name} placeholders are filled by t().
const en = {
  tagline: "hooks for ad modifications",
  modeLive: "Live · OpenRouter",
  modeDemo: "Demo mode",
  winnerTitle: "Winner",
  winnerDesc: "Paste a winning script. HookLab writes new first 3 seconds, the body and CTA stay as they are.",
  example: "Example",
  customScript: "Your own script",
  winnerId: "Winner ID",
  script: "Winning script",
  scriptPlaceholder: "Paste the script: hook (0–3 s), body, CTA…",
  count: "Number of variants",
  countHint: "1 to 30",
  angles: "Angles",
  anglesHint: "none selected = mix",
  model: "Model",
  modelHint: "via OpenRouter",
  modelDemoHint: "not used in demo mode",
  notes: "Notes",
  optional: "optional",
  notesPlaceholder: "e.g. no humor, focus on parents",
  generate: "Generate hooks",
  generating: "Generating…",
  estimate: "Estimated ≈ {cost} for {what} ({low}–{high})",
  calibrated: "Calibrated on {n} {runs}.",
  estimateDemo: "Demo mode is free. With an OpenRouter key, {what} would cost ≈ {cost}.",
  emptyTitle: "How it works",
  emptyStep1: "Pick an example or paste a winning script.",
  emptyStep2: "HookLab suggests new first 3 seconds: the visual, the first line and the on-screen text. The body and CTA stay as in the winner.",
  emptyStep3: "Click the variants you'll use and download the brief as CSV. Put mod_id into the creative name to match it with UA results later.",
  loading: "Writing new openings… usually 30–90 seconds",
  whyWon: "Why the winner works",
  keep: "Keep unchanged",
  selectedOf: "{n} of {total} selected",
  noneSelected: "{total} {variants} · nothing selected, the brief will include all",
  selectAll: "Select all",
  clearSelection: "Clear selection",
  export: "Download brief (CSV)",
  visual: "Visual · 0–3 s",
  onScreen: "On-screen text",
  use: "Use this",
  copy: "Copy",
  copied: "Copied to clipboard",
  regenerate: "Regenerate",
  regenerateDemoHint: "Regeneration needs an OpenRouter key",
  regenTitle: "Regenerate {id}",
  regenDesc: "Pick quick tweaks and/or describe what to change. The rest of the set stays as is.",
  regenNotesPlaceholder: "e.g. make it about the morning before school",
  cancel: "Cancel",
  regenerating: "Regenerating…",
  regenDone: "{id} updated",
  warnings: "Heads-up",
  metaLive: "Run {run} · {model}{via} · {secs} s · {input} in / {output} out tokens · {cost} (estimate {est})",
  metaDemo: "Run {run} · demo: a prepared example, no model was called",
  metaRegen: "Last regeneration: {id} · {model} · {secs} s · {cost} (estimate {est})",
  startFailed: "Couldn't start: {message}",
  statsButton: "Stats",
  statsTitle: "Usage stats",
  statsDesc: "Pilot metrics from this HookLab instance: what was generated, what designers took into briefs, and how diverse the hooks are.",
  statsRuns: "Runs",
  statsVariants: "{n} variants generated",
  statsTaken: "Taken into briefs",
  statsTakenCount: "{n} variants",
  statsRegen: "Regenerations per variant taken",
  statsDiversity: "Unique hooks within a winner",
  statsDiversityNa: "Needs 2+ runs for the same winner",
  statsLowest: "lowest {id}: {value}",
  statsCost: "Model cost",
  statsCostPerRun: "≈ {cost} per run",
  statsTarget: "target",
  statsAngles: "Angles",
  statsFootnote: "Designer time per modification and the win rate of HookLab hooks are measured outside the tool: time tracking and the UA report by mod_id.",
  language: "Language",
  angle_pain: "Pain",
  angle_curiosity: "Curiosity",
  angle_humor: "Humor",
  angle_social_proof: "Social proof",
  angle_contrarian: "Contrarian",
  angle_demo: "Product demo",
  angle_story: "Story",
  preset_dramatic: "More dramatic",
  preset_funnier: "Funnier",
  preset_shorter: "Shorter",
  preset_simpler: "Simpler",
  preset_visual: "Bolder visual",
  preset_ugc: "More UGC",
  preset_new_angle: "Different angle",
}

type Key = keyof typeof en

const uk: Record<Key, string> = {
  tagline: "хуки для модифікацій",
  modeLive: "Live · OpenRouter",
  modeDemo: "Демо-режим",
  winnerTitle: "Переможець",
  winnerDesc: "Вставте скрипт переможця. HookLab напише нові перші 3 секунди, тіло й CTA лишаються як є.",
  example: "Приклад",
  customScript: "Свій скрипт",
  winnerId: "ID переможця",
  script: "Скрипт переможця",
  scriptPlaceholder: "Вставте скрипт: хук (0–3 с), тіло, CTA…",
  count: "Скільки варіантів",
  countHint: "від 1 до 30",
  angles: "Кути",
  anglesHint: "нічого не вибрано = мікс",
  model: "Модель",
  modelHint: "через OpenRouter",
  modelDemoHint: "у демо-режимі не використовується",
  notes: "Нотатки",
  optional: "необов'язково",
  notesPlaceholder: "напр.: без гумору, акцент на батьків",
  generate: "Згенерувати хуки",
  generating: "Генерую…",
  estimate: "Орієнтовно ≈ {cost} за {what} ({low}–{high})",
  calibrated: "Уточнено за {n} {runs}.",
  estimateDemo: "Демо-режим безкоштовний. З ключем OpenRouter {what} коштували б ≈ {cost}.",
  emptyTitle: "Як це працює",
  emptyStep1: "Виберіть приклад або вставте скрипт креативу-переможця.",
  emptyStep2: "HookLab пропонує нові перші 3 секунди: візуал, першу фразу і текст на екрані. Тіло й CTA лишаються як у переможця.",
  emptyStep3: "Клацніть на варіанти, які берете в роботу, і завантажте бриф у CSV. mod_id із брифу йде в назву креативу, щоб потім зіставити його з результатами UA.",
  loading: "Пишу нові початки… зазвичай 30–90 секунд",
  whyWon: "Чому переможець працює",
  keep: "Що лишаємо без змін",
  selectedOf: "Вибрано {n} з {total}",
  noneSelected: "{total} {variants} · нічого не вибрано, у бриф підуть усі",
  selectAll: "Вибрати всі",
  clearSelection: "Зняти вибір",
  export: "Завантажити бриф (CSV)",
  visual: "Візуал · 0–3 с",
  onScreen: "Текст на екрані",
  use: "Беру в роботу",
  copy: "Копіювати",
  copied: "Скопійовано",
  regenerate: "Перегенерувати",
  regenerateDemoHint: "Перегенерація працює лише з ключем OpenRouter",
  regenTitle: "Перегенерувати {id}",
  regenDesc: "Виберіть швидкі правки та/або опишіть, що змінити. Решта набору лишиться як є.",
  regenNotesPlaceholder: "напр.: зроби про ранок перед школою",
  cancel: "Скасувати",
  regenerating: "Перегенеровую…",
  regenDone: "{id} оновлено",
  warnings: "На що звернути увагу",
  metaLive: "Запуск {run} · {model}{via} · {secs} с · {input} вхідних / {output} вихідних токенів · {cost} (оцінка {est})",
  metaDemo: "Запуск {run} · демо: заздалегідь підготовлений приклад, модель не викликалася",
  metaRegen: "Остання перегенерація: {id} · {model} · {secs} с · {cost} (оцінка {est})",
  startFailed: "Не вдалося запустити: {message}",
  statsButton: "Статистика",
  statsTitle: "Статистика використання",
  statsDesc: "Метрики пілоту з цього HookLab: що згенерували, що дизайнери взяли в бриф і наскільки різноманітні хуки.",
  statsRuns: "Запуски",
  statsVariants: "згенеровано варіантів: {n}",
  statsTaken: "Узято в бриф",
  statsTakenCount: "варіантів: {n}",
  statsRegen: "Перегенерацій на узятий варіант",
  statsDiversity: "Унікальні хуки в межах переможця",
  statsDiversityNa: "Потрібно 2+ запуски для одного переможця",
  statsLowest: "найнижче {id}: {value}",
  statsCost: "Вартість моделей",
  statsCostPerRun: "≈ {cost} за запуск",
  statsTarget: "ціль",
  statsAngles: "Кути",
  statsFootnote: "Час дизайнера на модифікацію і win rate хуків з HookLab міряються поза утилітою: тайм-трекінгом і UA-звітом за mod_id.",
  language: "Мова",
  angle_pain: "Біль",
  angle_curiosity: "Інтрига",
  angle_humor: "Гумор",
  angle_social_proof: "Соцдоказ",
  angle_contrarian: "Провокація",
  angle_demo: "Демо продукту",
  angle_story: "Історія",
  preset_dramatic: "Драматичніше",
  preset_funnier: "Смішніше",
  preset_shorter: "Коротше",
  preset_simpler: "Простіше",
  preset_visual: "Сильніший візуал",
  preset_ugc: "Більше UGC",
  preset_new_angle: "Інший кут",
}

const DICT: Record<Lang, Record<Key, string>> = { en, uk }

// Plural word forms: [one, few, many]. English only needs one/many.
const WORDS = {
  variants: { en: ["variant", "variants", "variants"], uk: ["варіант", "варіанти", "варіантів"] },
  runs: { en: ["run", "runs", "runs"], uk: ["запуском", "запусками", "запусками"] },
} as const

function pluralIndex(lang: Lang, n: number): 0 | 1 | 2 {
  if (lang === "en") return n === 1 ? 0 : 2
  const d10 = n % 10
  const d100 = n % 100
  if (d10 === 1 && d100 !== 11) return 0
  if (d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14)) return 1
  return 2
}

interface I18n {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: Key, params?: Record<string, string | number>) => string
  plural: (word: keyof typeof WORDS, n: number) => string
}

const I18nContext = React.createContext<I18n | null>(null)

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem("hooklab.lang")
    if (saved === "en" || saved === "uk") return saved
  } catch {
    // storage unavailable: fall back to the browser language
  }
  return navigator.language.toLowerCase().startsWith("uk") ? "uk" : "en"
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>(initialLang)
  setApiLang(lang)

  React.useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = React.useMemo<I18n>(
    () => ({
      lang,
      setLang: (next) => {
        setLangState(next)
        try {
          localStorage.setItem("hooklab.lang", next)
        } catch {
          // not critical
        }
      },
      t: (key, params = {}) =>
        DICT[lang][key].replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? "")),
      plural: (word, n) => WORDS[word][lang][pluralIndex(lang, n)],
    }),
    [lang]
  )
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  const ctx = React.useContext(I18nContext)
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider")
  return ctx
}

export type { Key as I18nKey }
