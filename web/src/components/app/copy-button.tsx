import { useState } from "react"
import { CheckIcon, CopyIcon } from "lucide-react"

import { useT } from "@/lib/i18n/use-t"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"

// `label` says what is copied ("Copy listing ID"). The icon swaps for two seconds and a toast confirms.
export function CopyButton({ value, label }: { value: string; label: string }) {
  const { t } = useT()
  const [done, setDone] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value).then(
      () => {
        setDone(true)
        window.setTimeout(() => setDone(false), 2000)
        toast.add({ title: t("common.copied") })
      },
      () => toast.add({ title: t("common.copy_failed") })
    )
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      onClick={copy}
    >
      {done ? (
        <CheckIcon aria-hidden="true" />
      ) : (
        <CopyIcon aria-hidden="true" />
      )}
    </Button>
  )
}
