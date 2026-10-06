import { useId, useState, type FormEvent } from "react"
import { SearchIcon } from "lucide-react"

import { useT } from "@/lib/i18n/use-t"
import { CitySelect } from "@/components/app/city-select"
import { FormField } from "@/components/app/form-field"
import { SortSelect } from "@/components/app/sort-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { dealershipSorts, type DealershipSearch } from "../schemas"

// Every control writes the whole next filter set to the URL (page back to 1). The name waits for Search or Enter, like the search bar.
export function DealershipToolbar({
  search,
  onChange,
}: {
  search: DealershipSearch
  onChange: (next: DealershipSearch) => void
}) {
  const { t } = useT()
  const verifiedId = useId()
  const [q, setQ] = useState(search.q ?? "")
  // A chip, the back button or a cleared URL changes the keyword, so the field follows it.
  const [seen, setSeen] = useState(search.q)
  if (seen !== search.q) {
    setSeen(search.q)
    setQ(search.q ?? "")
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onChange({ ...search, q: q.trim() || undefined, page: 1 })
  }
  return (
    <div className="flex flex-col gap-3">
      <form
        role="search"
        aria-label={t("common.search")}
        onSubmit={submit}
        className="flex flex-wrap items-end gap-3"
      >
        <FormField
          label={t("directory.search_name")}
          className="min-w-60 flex-1"
        >
          {(c) => (
            <Input
              {...c}
              type="search"
              enterKeyHint="search"
              maxLength={60}
              placeholder={t("directory.search_placeholder")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          )}
        </FormField>
        <div className="w-full sm:w-56">
          <CitySelect
            value={search.city ?? ""}
            onChange={(city) =>
              onChange({ ...search, city: city || undefined, page: 1 })
            }
          />
        </div>
        <Button type="submit">
          <SearchIcon data-icon="inline-start" />
          {t("common.search")}
        </Button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Label className="min-h-11 gap-3 md:min-h-0">
          <Switch
            aria-labelledby={verifiedId}
            checked={search.verified ?? false}
            onCheckedChange={(on) =>
              onChange({ ...search, verified: on || undefined, page: 1 })
            }
          />
          <span id={verifiedId}>{t("directory.verified_only")}</span>
        </Label>
        <SortSelect
          value={search.sort}
          options={dealershipSorts}
          onChange={(sort) => onChange({ ...search, sort, page: 1 })}
        />
      </div>
    </div>
  )
}
