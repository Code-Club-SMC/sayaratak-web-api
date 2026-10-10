import { useState } from "react"

import { FormField } from "@/components/app/form-field"
import { ResponsiveDialog } from "@/components/app/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useT } from "@/lib/i18n/use-t"

// The reason goes to the advertiser with the rejection; the receipt is refused with it.
export function RejectCampaignDialog({
  pending,
  onReject,
  onClose,
}: {
  pending: boolean
  onReject: (reason: string) => void
  onClose: () => void
}) {
  const { t } = useT()
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string>()
  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={t("ads.reject_title")}
    >
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (reason.trim().length < 2) return setError("validation.required")
          onReject(reason.trim())
        }}
      >
        <FormField label={t("ads.reject_reason")} error={error}>
          {(c) => (
            <Textarea
              {...c}
              value={reason}
              maxLength={300}
              onChange={(e) => setReason(e.target.value)}
            />
          )}
        </FormField>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="destructive" disabled={pending}>
            {t("ads.reject")}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  )
}
