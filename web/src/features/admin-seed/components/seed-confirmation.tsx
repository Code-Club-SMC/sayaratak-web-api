import { useState } from "react"

import { useT } from "@/lib/i18n/use-t"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/app/confirm-dialog"
import { RemoveButton } from "@/components/app/remove-button"

export function SeedConfirmButton({
  onConfirm,
  disabled,
  pending,
}: {
  onConfirm: () => void
  disabled?: boolean
  pending?: boolean
}) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        type="button"
        variant="default"
        disabled={disabled || pending}
        onClick={() => setOpen(true)}
      >
        {t("admin.seed_action_start")}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("admin.seed_confirm_title")}
        description={t("admin.seed_confirm_description")}
        confirmLabel={t("admin.seed_confirm_action")}
        pending={pending}
        onConfirm={() => {
          setOpen(false)
          onConfirm()
        }}
      />
    </>
  )
}

export function SeedRemoveButton({
  onConfirm,
  disabled,
}: {
  onConfirm: () => void
  disabled?: boolean
}) {
  const { t } = useT()
  return (
    <RemoveButton
      variant="destructive"
      disabled={disabled}
      title={t("admin.seed_remove_title")}
      onConfirm={onConfirm}
    >
      {t("admin.seed_action_remove")}
    </RemoveButton>
  )
}
