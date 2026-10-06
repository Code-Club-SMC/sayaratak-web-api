import { useEffect, useState, type ComponentProps } from "react"
import { CheckIcon } from "lucide-react"

import { useT } from "@/lib/i18n/use-t"
import { useDelayedFlag } from "@/lib/use-delayed-flag"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

// Pending: disabled and `aria-busy` at once, a spinner only after 300 ms, and the label stays in the layout so the width never changes.
// `savedLabel` is set by the page after a successful save (for example `mutation.isSuccess`): the label reads "Saved" with a check for 1.5 s.
export function SubmitButton({
  pending,
  disabled,
  savedLabel,
  className,
  children,
  ...props
}: ComponentProps<typeof Button> & {
  pending?: boolean
  savedLabel?: boolean
}) {
  const { t } = useT()
  const spinner = useDelayedFlag(!!pending, { delayMs: 300, minMs: 0 })
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    if (!savedLabel) return
    setSaved(true)
    const id = window.setTimeout(() => setSaved(false), 1500)
    return () => window.clearTimeout(id)
  }, [savedLabel])
  return (
    <Button
      type="submit"
      {...props}
      className={cn("relative", className)}
      disabled={pending || disabled}
      aria-busy={pending}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1.5",
          spinner && "opacity-0"
        )}
      >
        {saved ? (
          <>
            <CheckIcon aria-hidden="true" />
            {t("common.saved")}
          </>
        ) : (
          children
        )}
      </span>
      {spinner && (
        <Spinner
          role="presentation"
          aria-hidden="true"
          aria-label={undefined}
          className="absolute"
        />
      )}
      <span role="status" className="sr-only">
        {saved ? t("common.saved") : ""}
      </span>
    </Button>
  )
}
