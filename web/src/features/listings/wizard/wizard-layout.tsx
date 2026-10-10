import type { ComponentProps, ReactNode } from "react"

import { Breadcrumbs } from "@/components/app/breadcrumbs"
import { FocusedTopBar } from "@/components/app/focused-top-bar"
import { Button } from "@/components/ui/button"
import { usePageTitle } from "@/features/dashboard/components/page-title"
import { useT } from "@/lib/i18n/use-t"
import { WizardStepIndicator } from "./wizard-step-indicator"

// One column, 640 below `lg` and 880 from `lg` (long steps lay fields in a grid): indicator and step sit on the page itself, no card, so the fields are white on grey (see `--field`). The sticky footer of the step lines up with the column, so the page keeps room under it. A dealer gets the same column inside the dashboard.
export function WizardLayout({
  context,
  editing,
  onExit,
  indicator,
  children,
}: {
  context: "public" | "dealer"
  editing: boolean
  // The done step has neither a draft to save nor steps to show.
  onExit?: () => void
  indicator?: ComponentProps<typeof WizardStepIndicator>
  children: ReactNode
}) {
  const { t } = useT()
  const title = t(editing ? "post.edit_listing" : "post.new_listing")
  usePageTitle(context === "dealer" ? title : "")
  const column = indicator && <WizardStepIndicator {...indicator} />
  // Inside the dealer dashboard: the sidebar and top bar stay, the breadcrumb and Save draft and exit open the page.
  if (context === "dealer")
    return (
      <div className="mx-auto flex w-full max-w-160 flex-col gap-4 lg:max-w-220">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Breadcrumbs
            items={[
              {
                label: t("dashboard.nav_inventory"),
                href: "/dealer/inventory",
              },
              { label: title },
            ]}
          />
          {onExit && (
            <Button type="button" variant="ghost" onClick={onExit}>
              {t("post.save_exit")}
            </Button>
          )}
        </div>
        {column}
        <div className="mt-2 flex flex-col gap-6">{children}</div>
      </div>
    )
  return (
    <div className="min-h-dvh pb-24">
      <FocusedTopBar
        action={onExit && { label: t("post.save_exit"), onClick: onExit }}
      />
      <div className="mx-auto w-full max-w-160 md:px-4 lg:max-w-220">
        {column && <div className="px-4 pt-2 md:px-0">{column}</div>}
        <main className="mt-4 flex flex-col gap-6 px-4 pt-2 md:px-0">
          {children}
        </main>
      </div>
    </div>
  )
}
