import { RefreshCwIcon } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatUsd, type Variant } from "@/lib/api"
import { useI18n, type I18nKey } from "@/lib/i18n"

interface Props {
  variant: Variant | null
  presets: string[]
  estimateUsd: number | null
  onClose: () => void
  onSubmit: (variant: Variant, presets: string[], notes: string) => void
}

export function RegenerateDialog({ variant, presets, estimateUsd, onClose, onSubmit }: Props) {
  const { t } = useI18n()
  const [picked, setPicked] = useState<string[]>([])
  const [notes, setNotes] = useState("")

  // Fresh form for every variant.
  useEffect(() => {
    setPicked([])
    setNotes("")
  }, [variant?.id, variant?.version])

  return (
    <Dialog open={variant !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {variant && (
          <>
            <DialogHeader>
              <DialogTitle>{t("regenTitle", { id: variant.id })}</DialogTitle>
              <DialogDescription>{t("regenDesc")}</DialogDescription>
            </DialogHeader>

            <blockquote className="rounded-xl border-l-4 border-primary bg-muted/60 px-4 py-3 text-sm font-medium">
              “{variant.first_line}”
            </blockquote>

            <ToggleGroup multiple variant="outline" size="sm" className="flex-wrap" value={picked} onValueChange={(v) => setPicked(v as string[])}>
              {presets.map((p) => (
                <ToggleGroupItem
                  key={p}
                  value={p}
                  className="aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground hover:aria-pressed:bg-primary/90"
                >
                  {t(`preset_${p}` as I18nKey)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            <Textarea
              rows={3}
              maxLength={500}
              value={notes}
              placeholder={t("regenNotesPlaceholder")}
              onChange={(e) => setNotes(e.target.value)}
            />

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                {t("cancel")}
              </Button>
              <Button onClick={() => onSubmit(variant, picked, notes)}>
                <RefreshCwIcon />
                {t("regenerate")}
                {estimateUsd != null && <span className="opacity-75">· ≈ {formatUsd(estimateUsd)}</span>}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
