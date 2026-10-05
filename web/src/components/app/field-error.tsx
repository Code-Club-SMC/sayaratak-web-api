import { useT } from "@/lib/i18n/use-t"
import { FieldError as BaseFieldError } from "@/components/ui/field"

// Schema messages are i18n keys, so this is the one place they become text.
export function FieldError({
  message,
  id,
  className,
}: {
  message?: string
  id?: string
  className?: string
}) {
  const { t } = useT()
  if (!message) return null
  return (
    <BaseFieldError id={id} className={className}>
      {t(message)}
    </BaseFieldError>
  )
}
