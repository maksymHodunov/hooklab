import { LoaderCircleIcon, SparklesIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatUsd, type Estimate, type Status, type Winner } from "@/lib/api"
import { useI18n, type I18nKey } from "@/lib/i18n"

export const MAX_COUNT = 30
const CUSTOM = "custom"

export interface FormState {
  example: string
  winnerId: string
  script: string
  count: number
  angles: string[]
  model: string
  notes: string
}

interface Props {
  status: Status
  winners: Winner[]
  form: FormState
  onChange: (patch: Partial<FormState>) => void
  estimate: Estimate | null
  loading: boolean
  onSubmit: () => void
}

function Field({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor} className="flex items-baseline gap-2">
        {label}
        {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
      </Label>
      {children}
    </div>
  )
}

export function HookForm({ status, winners, form, onChange, estimate, loading, onSubmit }: Props) {
  const { t, lang, plural } = useI18n()
  const live = status.mode === "live"

  const exampleItems = [
    { value: CUSTOM, label: t("customScript") },
    ...winners.map((w) => ({ value: w.id, label: `${w.id} · ${w.title[lang]}` })),
  ]
  const modelItems = status.models.map((m) => ({ value: m.id, label: `${m.label} · ${m.vendor}` }))

  const pickExample = (value: string) => {
    const w = winners.find((x) => x.id === value)
    onChange({ example: value, winnerId: w ? w.id : "CUSTOM", script: w ? w.script : "" })
  }

  const what = `${form.count} ${plural("variants", form.count)}`
  let estimateText = ""
  if (estimate) {
    estimateText = live
      ? t("estimate", {
          cost: formatUsd(estimate.expectedUsd),
          what,
          low: formatUsd(estimate.lowUsd),
          high: formatUsd(estimate.highUsd),
        }) +
        (estimate.calibratedRuns > 0
          ? ` ${t("calibrated", { n: estimate.calibratedRuns, runs: plural("runs", estimate.calibratedRuns) })}`
          : "")
      : t("estimateDemo", { what, cost: formatUsd(estimate.expectedUsd) })
  }

  return (
    <Card className="lg:sticky lg:top-20">
      <CardHeader>
        <CardTitle className="text-lg">{t("winnerTitle")}</CardTitle>
        <CardDescription>{t("winnerDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
        >
          <Field label={t("example")}>
            <Select items={exampleItems} value={form.example} onValueChange={(v) => v && pickExample(String(v))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {exampleItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label={t("winnerId")} htmlFor="winnerId">
            <Input
              id="winnerId"
              value={form.winnerId}
              maxLength={20}
              pattern="[A-Za-z0-9_\-]+"
              required
              onChange={(e) => onChange({ winnerId: e.target.value })}
            />
          </Field>

          <Field label={t("script")} htmlFor="script">
            <Textarea
              id="script"
              rows={11}
              required
              value={form.script}
              placeholder={t("scriptPlaceholder")}
              className="max-h-80 font-mono text-xs leading-relaxed"
              onChange={(e) => onChange({ script: e.target.value, example: CUSTOM })}
            />
          </Field>

          <Field label={t("count")} hint={t("countHint")}>
            <div className="flex items-center gap-3">
              <ToggleGroup
                variant="outline"
                spacing={0}
                value={[String(form.count)]}
                onValueChange={(v) => v[0] && onChange({ count: Number(v[0]) })}
              >
                {[5, 10, 15].map((n) => (
                  <ToggleGroupItem key={n} value={String(n)} className="px-4">
                    {n}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <Input
                type="number"
                min={1}
                max={MAX_COUNT}
                inputMode="numeric"
                aria-label={t("count")}
                className="w-20"
                value={form.count}
                onChange={(e) => {
                  const n = Math.round(Number(e.target.value))
                  if (Number.isFinite(n) && n >= 1) onChange({ count: Math.min(n, MAX_COUNT) })
                }}
              />
            </div>
          </Field>

          <Field label={t("angles")} hint={t("anglesHint")}>
            <ToggleGroup
              multiple
              variant="outline"
              size="sm"
              className="flex-wrap"
              value={form.angles}
              onValueChange={(v) => onChange({ angles: v as string[] })}
            >
              {status.angles.map((a) => (
                <ToggleGroupItem
                  key={a}
                  value={a}
                  className="aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground hover:aria-pressed:bg-primary/90"
                >
                  {t(`angle_${a}` as I18nKey)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>

          <Field label={t("model")} hint={live ? t("modelHint") : t("modelDemoHint")}>
            <Select
              items={modelItems}
              value={form.model}
              disabled={!live}
              onValueChange={(v) => v && onChange({ model: String(v) })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {modelItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label={t("notes")} hint={t("optional")} htmlFor="notes">
            <Input
              id="notes"
              maxLength={500}
              value={form.notes}
              placeholder={t("notesPlaceholder")}
              onChange={(e) => onChange({ notes: e.target.value })}
            />
          </Field>

          <div className="flex flex-col gap-2">
            <Button type="submit" size="lg" disabled={loading} className="w-full">
              {loading ? <LoaderCircleIcon className="animate-spin" /> : <SparklesIcon />}
              {loading ? t("generating") : t("generate")}
            </Button>
            <p className="min-h-8 text-center text-xs leading-relaxed text-muted-foreground" aria-live="polite">
              {estimateText}
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
