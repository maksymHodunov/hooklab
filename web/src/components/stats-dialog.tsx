import { CircleCheckIcon, CircleDashedIcon, TriangleAlertIcon } from "lucide-react"
import { useEffect, useState } from "react"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"
import { useI18n, type I18nKey } from "@/lib/i18n"

// Same numbers as `npm run report` (src/report.ts).
interface Report {
  runs: number
  variants: number
  uniqueWithinWinner: number | null
  worstWinner: { winnerId: string; unique: number } | null
  angles: Record<string, number>
  exported: number
  regenerations: number
  costUsd: number
}

type Status = "good" | "warn" | "na"

const pct = (x: number) => `${Math.round(x * 100)}%`

function StatusLine({ status, text }: { status: Status; text: string }) {
  // Status always ships with an icon and words, never color alone.
  const Icon = status === "good" ? CircleCheckIcon : status === "warn" ? TriangleAlertIcon : CircleDashedIcon
  const color = status === "good" ? "text-emerald-600" : status === "warn" ? "text-amber-600" : "text-muted-foreground"
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className={`size-3.5 shrink-0 ${color}`} />
      {text}
    </span>
  )
}

function Tile({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border bg-card p-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      {children}
    </div>
  )
}

export function StatsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    setError("")
    api
      .get<Report>("/api/report")
      .then(setReport)
      .catch((err: Error) => setError(err.message))
  }, [open])

  const r = report
  const takenShare = r && r.variants ? r.exported / r.variants : null
  const regenPerTaken = r && r.exported ? r.regenerations / r.exported : null
  const status = (value: number | null, ok: (v: number) => boolean): Status => (value === null ? "na" : ok(value) ? "good" : "warn")
  const angles = r ? Object.entries(r.angles).sort((a, b) => b[1] - a[1]) : []
  const maxAngle = Math.max(1, ...angles.map(([, n]) => n))

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("statsTitle")}</DialogTitle>
          <DialogDescription>{t("statsDesc")}</DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {!r && !error && <Skeleton className="h-64 rounded-2xl" />}

        {r && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Tile label={t("statsRuns")} value={String(r.runs)}>
                <span className="text-xs text-muted-foreground">{t("statsVariants", { n: r.variants })}</span>
              </Tile>
              <Tile label={t("statsTaken")} value={takenShare === null ? "—" : pct(takenShare)}>
                <StatusLine
                  status={status(takenShare, (v) => v >= 0.3)}
                  text={`${t("statsTakenCount", { n: r.exported })} · ${t("statsTarget")} ≥ 30%`}
                />
              </Tile>
              <Tile label={t("statsRegen")} value={regenPerTaken === null ? "—" : regenPerTaken.toFixed(2)}>
                <StatusLine status={status(regenPerTaken, (v) => v <= 1)} text={`${t("statsTarget")} ≤ 1`} />
              </Tile>
              <Tile label={t("statsDiversity")} value={r.uniqueWithinWinner === null ? "—" : pct(r.uniqueWithinWinner)}>
                <StatusLine
                  status={status(r.uniqueWithinWinner, (v) => v >= 0.9)}
                  text={
                    r.uniqueWithinWinner === null
                      ? t("statsDiversityNa")
                      : `${t("statsTarget")} ≥ 90% · ${t("statsLowest", { id: r.worstWinner!.winnerId, value: pct(r.worstWinner!.unique) })}`
                  }
                />
              </Tile>
              <Tile label={t("statsCost")} value={`$${r.costUsd.toFixed(2)}`}>
                <span className="text-xs text-muted-foreground">
                  {r.runs ? t("statsCostPerRun", { cost: `$${(r.costUsd / r.runs).toFixed(3)}` }) : "—"}
                </span>
              </Tile>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">{t("statsAngles")}</span>
              {angles.length === 0 && <span className="text-sm text-muted-foreground">—</span>}
              <ul className="flex flex-col gap-1.5">
                {angles.map(([angle, n]) => (
                  <li key={angle} className="grid grid-cols-[8rem_1fr_3rem] items-center gap-3 text-sm" title={`${n} / ${r.variants}`}>
                    <span className="truncate text-muted-foreground">{t(`angle_${angle}` as I18nKey)}</span>
                    <span className="h-2.5 rounded-full bg-muted">
                      <span className="block h-full rounded-full bg-primary" style={{ width: `${(n / maxAngle) * 100}%` }} />
                    </span>
                    <span className="text-right tabular-nums">{pct(n / Math.max(r.variants, 1))}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">{t("statsFootnote")}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
