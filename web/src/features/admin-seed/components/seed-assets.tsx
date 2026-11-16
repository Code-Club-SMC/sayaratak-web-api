import { useRef, type ChangeEvent } from "react"

import { useT } from "@/lib/i18n/use-t"
import { Button } from "@/components/ui/button"
import { useUploadSeedArchive } from "../queries"

export function SeedAssets({
  manifestDigest,
  accepted,
  total,
  rejected,
  disabled,
}: {
  manifestDigest: string
  accepted: number
  total: number
  rejected: number
  disabled?: boolean
}) {
  const { t } = useT()
  const upload = useUploadSeedArchive()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    upload.mutate(
      { file, manifestDigest },
      {
        onSettled: () => {
          if (inputRef.current) inputRef.current.value = ""
        },
      }
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between text-ui">
        <span className="font-medium text-foreground">
          {t("admin.seed_assets_title")}
        </span>
        <span className="text-caption font-semibold text-muted-foreground">
          {accepted} / {total} {t("admin.seed_assets_accepted")}
        </span>
      </div>

      {rejected > 0 && (
        <span className="text-caption text-destructive">
          {t("admin.seed_assets_rejected", { count: rejected })}
        </span>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          disabled={disabled || upload.isPending}
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          disabled={disabled || upload.isPending}
          onClick={() => inputRef.current?.click()}
        >
          {upload.isPending
            ? t("admin.seed_uploading_archive")
            : t("admin.seed_action_upload_archive")}
        </Button>
      </div>

      {upload.isError && (
        <span className="text-caption text-destructive">
          {t("admin.seed_upload_error")}
        </span>
      )}
    </div>
  )
}
