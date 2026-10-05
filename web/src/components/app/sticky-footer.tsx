import type { ReactNode } from "react"

import { useT } from "@/lib/i18n/use-t"
import { Button } from "@/components/ui/button"

// Fixed to the bottom, so the page needs bottom padding of about 5rem. The 1 px top line is the one A5 allows on sticky layers.
export function StickyFooter({
  onBack,
  skip,
  children,
}: {
  onBack?: () => void
  skip?: ReactNode
  children: ReactNode
}) {
  const { t } = useT()
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex w-full max-w-xl items-center gap-3">
        {onBack && (
          <Button type="button" variant="ghost" onClick={onBack}>
            {t("common.back")}
          </Button>
        )}
        <div className="ms-auto flex items-center gap-3">
          {skip}
          {children}
        </div>
      </div>
    </div>
  )
}
