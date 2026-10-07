import type { ComponentProps, ReactNode } from "react"

import { Breadcrumbs } from "@/components/app/breadcrumbs"
import { FocusedTopBar } from "@/components/app/focused-top-bar"
import { useT } from "@/lib/i18n/use-t"
import { WizardStepIndicator } from "./wizard-step-indicator"

// One 640 column: indicator on the page, the step in a card (padding 24; edge to edge on phones). The sticky footer of the step lines up with the column, so the page keeps room under it.
export function WizardLayout({
  context,
  editing,
  onExit,
  indicator,
  children,
}: {
  context: "public" | "dealer"
  editing: boolean
  onExit: () => void
  indicator: ComponentProps<typeof WizardStepIndicator>
  children: ReactNode
}) {
  const { t } = useT()
  return (
    <div className="min-h-dvh pb-24">
      <FocusedTopBar
        start={
          context === "dealer" ? (
            <Breadcrumbs
              items={[
                { label: t("post.inventory"), href: "/dealer/inventory" },
                {
                  label: t(editing ? "post.edit_listing" : "post.new_listing"),
                },
              ]}
            />
          ) : undefined
        }
        action={{ label: t("post.save_exit"), onClick: onExit }}
      />
      <div className="mx-auto w-full max-w-160 md:px-4">
        <div className="px-4 pt-2 md:px-0">
          <WizardStepIndicator {...indicator} />
        </div>
        <main className="mt-4 flex flex-col gap-6 bg-card p-6 md:rounded-xl">
          {children}
        </main>
      </div>
    </div>
  )
}
