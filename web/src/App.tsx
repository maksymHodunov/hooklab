import {
  CircleAlertIcon,
  DownloadIcon,
  LayersIcon,
  ListChecksIcon,
  MagnetIcon,
  PinIcon,
  SparklesIcon,
  TriangleAlertIcon,
  WandSparklesIcon,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import { HookForm, type FormState } from "@/components/hook-form"
import { RegenerateDialog } from "@/components/regenerate-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Toaster } from "@/components/ui/sonner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { VariantCard } from "@/components/variant-card"
import {
  api,
  formatUsd,
  type Estimate,
  type Lang,
  type RegenerateResponse,
  type Run,
  type Status,
  type Variant,
  type Winner,
} from "@/lib/api"
import { useI18n } from "@/lib/i18n"

const emptyForm: FormState = {
  example: "custom",
  winnerId: "CUSTOM",
  script: "",
  count: 10,
  angles: [],
  model: "",
  notes: "",
}

export default function App() {
  const { t, lang, setLang, plural } = useI18n()
  const [status, setStatus] = useState<Status | null>(null)
  const [winners, setWinners] = useState<Winner[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [run, setRun] = useState<Run | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [freshKey, setFreshKey] = useState<string | null>(null)
  const [regenTarget, setRegenTarget] = useState<Variant | null>(null)
  const [rewriteEstimate, setRewriteEstimate] = useState<number | null>(null)
  const [regenMeta, setRegenMeta] = useState("")
  const [estimateTick, setEstimateTick] = useState(0)
  const errorRef = useRef<HTMLDivElement>(null)

  const live = status?.mode === "live"
  const patchForm = useCallback((patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch })), [])

  // Initial load: status (mode, models, angles) and the sample winners; the first sample is prefilled.
  useEffect(() => {
    Promise.all([api.get<Status>("/api/status"), api.get<Winner[]>("/api/winners")])
      .then(([s, w]) => {
        setStatus(s)
        setWinners(w)
        const first = w[0]
        setForm((f) => ({
          ...f,
          model: s.defaultModel,
          ...(first ? { example: first.id, winnerId: first.id, script: first.script } : {}),
        }))
      })
      .catch((err: Error) => setError(t("startFailed", { message: err.message })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cost estimate for the form, debounced while the user types.
  useEffect(() => {
    if (!status) return
    const timer = setTimeout(() => {
      api
        .post<Estimate>("/api/estimate", { ...form, lang })
        .then(setEstimate)
        .catch(() => setEstimate(null))
    }, 300)
    return () => clearTimeout(timer)
  }, [status, form, lang, estimateTick])

  // Cost estimate for regenerating one variant with the current model.
  useEffect(() => {
    if (!live || !run) return
    api
      .post<Estimate>("/api/estimate", { kind: "regenerate", runId: run.runId, model: form.model, lang })
      .then((e) => setRewriteEstimate(e.expectedUsd))
      .catch(() => setRewriteEstimate(null))
  }, [live, run?.runId, form.model, lang, estimateTick]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [error])

  const generate = async () => {
    setError("")
    setLoading(true)
    try {
      const next = await api.post<Run>("/api/generate", { ...form, lang })
      setRun(next)
      setSelected(new Set())
      setRegenMeta("")
      setFreshKey(next.runId)
      setEstimateTick((n) => n + 1) // the log now has the actual cost: refresh the calibrated estimate
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const regenerate = async (variant: Variant, presets: string[], notes: string) => {
    if (!run) return
    setRegenTarget(null)
    setBusyId(variant.id)
    try {
      const res = await api.post<RegenerateResponse>("/api/regenerate", {
        runId: run.runId,
        variantId: variant.id,
        presets,
        notes,
        model: form.model,
        lang,
      })
      setRun((r) => (r ? { ...r, variants: r.variants.map((v) => (v.id === variant.id ? res.variant : v)), warnings: res.warnings } : r))
      setFreshKey(`${res.variant.id}-${res.variant.version}`)
      setRegenMeta(
        t("metaRegen", {
          id: res.variant.mod_id,
          model: res.modelUsed,
          secs: (res.ms / 1000).toFixed(1),
          cost: res.usage.costUsd != null ? `$${res.usage.costUsd.toFixed(4)}` : "—",
          est: formatUsd(res.estimate.expectedUsd),
        })
      )
      setEstimateTick((n) => n + 1)
      toast.success(t("regenDone", { id: res.variant.mod_id }))
    } catch (err) {
      toast.error(`${variant.id}: ${(err as Error).message}`)
    } finally {
      setBusyId(null)
    }
  }

  const exportCsv = async () => {
    if (!run) return
    try {
      const blob = await api.blob("/api/export", { runId: run.runId, selectedIds: [...selected] })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `brief-${run.winnerId}-${run.runId}.csv`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const runMeta = useMemo(() => {
    if (!run) return ""
    if (run.mode === "demo") return t("metaDemo", { run: run.runId })
    return t("metaLive", {
      run: run.runId,
      model: run.modelUsed ?? "",
      via: run.provider ? ` (${run.provider})` : "",
      secs: (run.ms / 1000).toFixed(1),
      input: run.usage?.inputTokens ?? 0,
      output: run.usage?.outputTokens ?? 0,
      cost: run.usage?.costUsd != null ? `$${run.usage.costUsd.toFixed(4)}` : "—",
      est: formatUsd(run.estimate.expectedUsd),
    })
  }, [run, t])

  const total = run?.variants.length ?? 0
  const allSelected = total > 0 && selected.size === total

  return (
    <div className="min-h-svh bg-muted/40">
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <MagnetIcon className="size-5" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-semibold">HookLab</span>
              <span className="hidden text-xs text-muted-foreground sm:block">SockLock · {t("tagline")}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {status && (
              <Badge variant={live ? "default" : "secondary"} className="gap-1.5">
                <span className={live ? "size-1.5 rounded-full bg-primary-foreground" : "size-1.5 rounded-full bg-amber-500"} />
                {live ? t("modeLive") : t("modeDemo")}
              </Badge>
            )}
            <ToggleGroup
              variant="outline"
              size="sm"
              spacing={0}
              aria-label={t("language")}
              value={[lang]}
              onValueChange={(v) => v[0] && setLang(v[0] as Lang)}
            >
              <ToggleGroupItem value="en">EN</ToggleGroupItem>
              <ToggleGroupItem value="uk">UK</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1440px] items-start gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(320px,400px)_1fr]">
        {status ? (
          <HookForm
            status={status}
            winners={winners}
            form={form}
            onChange={patchForm}
            estimate={estimate}
            loading={loading}
            onSubmit={generate}
          />
        ) : (
          <Skeleton className="h-[640px] rounded-4xl" />
        )}

        <section className="flex min-w-0 flex-col gap-5" aria-live="polite">
          {error && (
            <Alert variant="destructive" ref={errorRef}>
              <CircleAlertIcon />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <WandSparklesIcon className="size-4 animate-pulse text-primary" />
                {t("loading")}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-72 rounded-4xl" />
                ))}
              </div>
            </>
          ) : run ? (
            <>
              <Card className="bg-primary/[0.04]">
                <CardContent className="grid gap-5 md:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-primary uppercase">
                      <SparklesIcon className="size-4" />
                      {t("whyWon")}
                    </h3>
                    <p className="text-sm leading-relaxed">{run.winner_analysis.why_it_won}</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-primary uppercase">
                      <PinIcon className="size-4" />
                      {t("keep")}
                    </h3>
                    <p className="text-sm leading-relaxed">{run.winner_analysis.keep_unchanged}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="z-10 -mx-1 sm:sticky sm:top-16 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted/80 px-1 py-2 backdrop-blur">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ListChecksIcon className="size-4" />
                  {selected.size > 0
                    ? t("selectedOf", { n: selected.size, total })
                    : t("noneSelected", { total, variants: plural("variants", total) })}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelected(allSelected ? new Set() : new Set(run.variants.map((v) => v.id)))}
                  >
                    <LayersIcon />
                    {allSelected ? t("clearSelection") : t("selectAll")}
                  </Button>
                  <Button onClick={exportCsv}>
                    <DownloadIcon />
                    {t("export")}
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {run.variants.map((v) => (
                  <VariantCard
                    key={`${v.id}-${v.version}`}
                    variant={v}
                    selected={selected.has(v.id)}
                    busy={busyId === v.id}
                    canRegenerate={live}
                    fresh={freshKey === run.runId || freshKey === `${v.id}-${v.version}`}
                    onToggle={() => toggle(v.id)}
                    onRegenerate={() => setRegenTarget(v)}
                  />
                ))}
              </div>

              {run.warnings.length > 0 && (
                <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                  <TriangleAlertIcon className="text-amber-600" />
                  <AlertTitle>{t("warnings")}</AlertTitle>
                  <AlertDescription className="text-amber-900/90">
                    <ul className="list-disc space-y-1 pl-4">
                      {run.warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <p className="text-xs whitespace-pre-line text-muted-foreground">
                {runMeta}
                {regenMeta && `\n${regenMeta}`}
              </p>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <WandSparklesIcon className="size-5 text-primary" />
                  {t("emptyTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="flex flex-col gap-4">
                  {[t("emptyStep1"), t("emptyStep2"), t("emptyStep3")].map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
        </section>
      </main>

      <RegenerateDialog
        variant={regenTarget}
        presets={status?.presets ?? []}
        estimateUsd={rewriteEstimate}
        onClose={() => setRegenTarget(null)}
        onSubmit={regenerate}
      />
      <Toaster position="bottom-right" richColors />
    </div>
  )
}
