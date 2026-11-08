import { CheckIcon, ClapperboardIcon, CopyIcon, LightbulbIcon, LoaderCircleIcon, RefreshCwIcon } from "lucide-react"
import { cn } from "cn"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import type { Variant } from "@/lib/api"
import { useI18n, type I18nKey } from "@/lib/i18n"
import { useState } from "react"

// One color per angle, so a set reads at a glance.
const ANGLE_STYLES: Record<string, string> = {
  pain: "bg-rose-100 text-rose-700",
  curiosity: "bg-sky-100 text-sky-700",
  humor: "bg-amber-100 text-amber-800",
  social_proof: "bg-emerald-100 text-emerald-700",
  contrarian: "bg-violet-100 text-violet-700",
  demo: "bg-cyan-100 text-cyan-800",
  story: "bg-orange-100 text-orange-700",
}

interface Props {
  variant: Variant
  selected: boolean
  busy: boolean
  canRegenerate: boolean
  fresh: boolean
  onToggle: () => void
  onRegenerate: () => void
}

export function VariantCard({ variant: v, selected, busy, canRegenerate, fresh, onToggle, onRegenerate }: Props) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(`${v.mod_id}\nVO: ${v.first_line}\nOn-screen: ${v.on_screen_text}\nVisual: ${v.hook_visual}`)
    setCopied(true)
    toast.success(t("copied"))
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    // The whole card toggles selection; controls in the footer stop the click from bubbling.
    <Card
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={() => !busy && onToggle()}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault()
          onToggle()
        }
      }}
      className={cn(
        "relative cursor-pointer gap-4 transition-all select-none hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        selected && "bg-primary/[0.04] ring-2! ring-primary! hover:shadow-primary/10",
        fresh && "animate-in duration-500 fade-in zoom-in-95"
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <code className="truncate text-xs text-muted-foreground">{v.mod_id}</code>
        <div className="flex shrink-0 items-center gap-2">
          <Badge className={cn("border-0", ANGLE_STYLES[v.angle])}>{t(`angle_${v.angle}` as I18nKey)}</Badge>
          <span
            className={cn(
              "flex size-5 items-center justify-center rounded-full border transition-colors",
              selected ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent"
            )}
            aria-hidden
          >
            <CheckIcon className="size-3.5" strokeWidth={3} />
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <p className="text-lg leading-snug font-semibold text-balance">“{v.first_line}”</p>

        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{t("onScreen")}</span>
          <span className="self-start rounded-lg bg-foreground px-2.5 py-1 text-sm font-semibold text-background">
            {v.on_screen_text}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            <ClapperboardIcon className="size-3.5" />
            {t("visual")}
          </span>
          <p className="text-sm leading-relaxed">{v.hook_visual}</p>
        </div>

        <p className="mt-auto flex gap-2 rounded-xl bg-muted/60 p-3 text-sm leading-relaxed text-muted-foreground">
          <LightbulbIcon className="mt-0.5 size-4 shrink-0 text-amber-500" />
          {v.why}
        </p>
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-2 border-t pt-4" onClick={(e) => e.stopPropagation()}>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm whitespace-nowrap">
          <Checkbox checked={selected} onCheckedChange={onToggle} disabled={busy} />
          {t("use")}
        </label>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-0.5">
          <Button variant="ghost" size="sm" onClick={copy} disabled={busy}>
            {copied ? <CheckIcon /> : <CopyIcon />}
            {t("copy")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRegenerate}
            disabled={busy || !canRegenerate}
            title={canRegenerate ? undefined : t("regenerateDemoHint")}
          >
            <RefreshCwIcon />
            {t("regenerate")}
          </Button>
        </div>
      </CardFooter>

      {busy && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-[inherit] bg-background/75 text-sm font-medium text-primary backdrop-blur-[1px]">
          <LoaderCircleIcon className="size-4 animate-spin" />
          {t("regenerating")}
        </div>
      )}
    </Card>
  )
}
