import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { CircleCheckIcon } from "lucide-react"

import { errorText } from "@/lib/api/error-text"
import { useT } from "@/lib/i18n/use-t"
import type { Backup } from "@/schemas/admin"
import { useRestoreBackup } from "@/features/admin/queries"
import { FormField } from "@/components/app/form-field"
import { ResponsiveDialog } from "@/components/app/responsive-dialog"
import { SubmitButton } from "@/components/app/submit-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAppForm } from "@/hooks/use-app-form"
import { restoreConfirmSchema, type RestoreConfirm } from "../schemas"
import { backupDate } from "./use-backup-columns"

// Says what goes back and asks for the typed word. While it restores the form stays in place, disabled, with the button busy and no way to close; then the result.
export function RestoreDialog({
  backup,
  onClose,
}: {
  backup: Backup | undefined
  onClose: () => void
}) {
  const { t, locale } = useT()
  const restore = useRestoreBackup()
  const [done, setDone] = useState(false)
  const phrase = t("admin.restore_phrase")
  const form = useAppForm<RestoreConfirm>({
    resolver: zodResolver(restoreConfirmSchema(phrase)),
    mode: "onSubmit",
    defaultValues: { phrase: "" },
  })
  const date = backup ? backupDate(backup.createdAt, locale) : ""
  return (
    <ResponsiveDialog
      open={!!backup}
      onOpenChange={(open) => !open && !restore.isPending && onClose()}
      title={t("admin.restore_title")}
      closable={!restore.isPending}
    >
      {done ? (
        <div role="status" className="flex flex-col items-start gap-4">
          <p className="flex items-center gap-2 text-body">
            <CircleCheckIcon
              aria-hidden="true"
              className="size-5 text-success"
            />
            {t("admin.restore_done", { date })}
          </p>
          <Button type="button" onClick={onClose}>
            {t("common.close")}
          </Button>
        </div>
      ) : (
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(() => {
            if (!backup) return
            restore.mutate(backup.id, {
              onSuccess: () => setDone(true),
              onError: (e) =>
                form.setError("root", { message: errorText(t, e) }),
            })
          })}
        >
          <p className="text-body text-muted-foreground">
            {t("admin.restore_body", { date })}
          </p>
          <fieldset
            disabled={restore.isPending}
            className="flex flex-col gap-4"
          >
            <FormField
              label={t("admin.restore_type", { phrase })}
              error={form.formState.errors.phrase?.message}
            >
              {(props) => (
                <Input
                  {...props}
                  autoComplete="off"
                  spellCheck={false}
                  {...form.register("phrase")}
                />
              )}
            </FormField>
            {form.formState.errors.root && (
              <p role="alert" className="text-ui text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <SubmitButton variant="destructive" pending={restore.isPending}>
                {t(restore.isPending ? "admin.restoring" : "admin.restore")}
              </SubmitButton>
              <Button type="button" variant="ghost" onClick={onClose}>
                {t("common.cancel")}
              </Button>
            </div>
          </fieldset>
        </form>
      )}
    </ResponsiveDialog>
  )
}
