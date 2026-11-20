import { useEffect, useState, type ReactNode } from "react"
import { Columns3Icon, SearchIcon } from "lucide-react"

import { useT } from "@/lib/i18n/use-t"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

export type ColumnToggle = {
  id: string
  label: string
  visible: boolean
  toggle: () => void
}

// Search applies after a short pause so each keystroke does not push a URL. `filters` holds the page's own selects.
export function DataTableToolbar({
  search,
  onSearch,
  filters,
  columns,
}: {
  search?: string
  onSearch?: (value: string) => void
  filters?: ReactNode
  columns: ColumnToggle[]
}) {
  const { t } = useT()
  const [draft, setDraft] = useState(search ?? "")
  useEffect(() => setDraft(search ?? ""), [search])
  useEffect(() => {
    if (!onSearch || draft === (search ?? "")) return
    const id = window.setTimeout(() => onSearch(draft), 300)
    return () => window.clearTimeout(id)
  }, [draft, search, onSearch])
  return (
    <div className="flex flex-wrap items-center gap-2">
      {onSearch && (
        <label className="relative w-full max-w-xs">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label={t("common.search")}
            placeholder={t("common.search")}
            enterKeyHint="search"
            className="h-8 bg-transparent ps-8"
          />
        </label>
      )}
      {filters}
      {columns.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="ms-auto"
                aria-label={t("table.columns")}
              />
            }
          >
            <Columns3Icon aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {columns.map((c) => (
              <DropdownMenuCheckboxItem
                key={c.id}
                checked={c.visible}
                onCheckedChange={c.toggle}
                className="min-h-(--control-h)"
              >
                {c.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
