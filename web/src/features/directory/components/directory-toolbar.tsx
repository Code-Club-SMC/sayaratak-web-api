import { useState, type FormEvent, type ReactNode } from "react"
import { SearchIcon } from "lucide-react"

import { useT } from "@/lib/i18n/use-t"
import { FormField } from "@/components/app/form-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// The frame every directory toolbar shares: a name search that waits for Search or Enter (like the search bar), the page's own `fields` beside it, and a second row (`children`) for switches and sort.
export function DirectoryToolbar({
  q,
  nameLabel,
  onSearch,
  fields,
  children,
}: {
  q: string | undefined
  nameLabel: string
  onSearch: (q: string | undefined) => void
  fields: ReactNode
  children: ReactNode
}) {
  const { t } = useT()
  const [draft, setDraft] = useState(q ?? "")
  // A chip, the back button or a cleared URL changes the keyword, so the field follows it.
  const [seen, setSeen] = useState(q)
  if (seen !== q) {
    setSeen(q)
    setDraft(q ?? "")
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSearch(draft.trim() || undefined)
  }
  return (
    <div className="flex flex-col gap-3">
      <form
        role="search"
        aria-label={t("common.search")}
        onSubmit={submit}
        className="flex flex-wrap items-end gap-3"
      >
        <FormField label={nameLabel} className="min-w-60 flex-1">
          {(c) => (
            <Input
              {...c}
              type="search"
              enterKeyHint="search"
              maxLength={60}
              placeholder={t("directory.search_placeholder")}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          )}
        </FormField>
        {fields}
        <Button type="submit">
          <SearchIcon data-icon="inline-start" />
          {t("common.search")}
        </Button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {children}
      </div>
    </div>
  )
}
