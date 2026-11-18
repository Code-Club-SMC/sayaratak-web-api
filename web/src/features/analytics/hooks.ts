import { useNavigate, useSearch } from "@tanstack/react-router"

import type { PeriodQuery } from "@sayaratak/shared/schemas/period"
import { reportSearchSchema } from "./schemas"

// The report period of the page URL and a setter that keeps it there (defaults dropped, so a plain link stays plain).
export function usePeriodSearch() {
  const query = reportSearchSchema.parse(useSearch({ strict: false }))
  const navigate = useNavigate()
  const setQuery = (next: PeriodQuery) =>
    void navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        range: next.from || next.range === "30d" ? undefined : next.range,
        from: next.from,
        to: next.to,
        compare: next.compare === "previous" ? undefined : next.compare,
        // A paged report starts over on a new period.
        page: undefined,
      }),
      replace: true,
      resetScroll: false,
      viewTransition: false,
    })
  return { query, setQuery }
}
