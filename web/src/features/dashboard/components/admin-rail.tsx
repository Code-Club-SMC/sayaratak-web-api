import { useT } from "@/lib/i18n/use-t"
import { useSidebar } from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { NavGroup } from "../nav-config"

// The admin's section rail: one icon per nav group. Picking one shows that group in the panel beside it (and opens the panel when it is folded away). A warning dot says the section has work waiting.
export function AdminRail({
  groups,
  current,
  busy,
  onPick,
}: {
  groups: NavGroup[]
  current: number
  busy: (group: NavGroup) => boolean
  onPick: (index: number) => void
}) {
  const { t } = useT()
  const { setOpen } = useSidebar()
  return (
    <div
      role="tablist"
      aria-orientation="vertical"
      aria-label={t("dashboard.menu")}
      className="flex w-14 shrink-0 flex-col items-center gap-1 border-e py-2"
    >
      {groups.map((group, i) => {
        const Icon = group.icon
        if (!Icon || !group.key) return null
        const label = t(group.key)
        return (
          <Tooltip key={group.key}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  role="tab"
                  aria-selected={current === i}
                  aria-label={label}
                  onClick={() => {
                    onPick(i)
                    setOpen(true)
                  }}
                  className="relative grid size-10 place-items-center rounded-lg text-muted-foreground motion-color hover:bg-muted hover:text-foreground aria-selected:bg-card aria-selected:text-foreground aria-selected:shadow-panel"
                />
              }
            >
              <Icon aria-hidden="true" className="size-5" />
              {busy(group) && (
                <span
                  aria-hidden="true"
                  className="absolute end-2 top-2 size-1.5 rounded-full bg-warning"
                />
              )}
            </TooltipTrigger>
            <TooltipContent side="inline-end">{label}</TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
