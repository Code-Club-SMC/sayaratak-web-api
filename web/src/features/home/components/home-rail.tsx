import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"

import type { listingQueries } from "@/features/listings/queries"
import { useDelayedFlag } from "@/lib/use-delayed-flag"
import { useT } from "@/lib/i18n/use-t"
import { ListingRail } from "@/components/app/listing-rail"
import { SectionError } from "@/components/app/section-error"
import { RailSkeleton } from "./rail-skeleton"

// One home rail: skeleton after 150 ms, an error with retry, and `empty` when there are no listings.
export function HomeRail({
  query,
  title,
  href,
  action,
  empty,
  eager,
}: {
  query: ReturnType<typeof listingQueries.rail>
  title: string
  href: string
  action?: ReactNode
  empty: ReactNode
  // How many of the first cards load their photo at once, without a fade.
  eager?: number
}) {
  const { t } = useT()
  const { data, isPending, isError, refetch } = useQuery(query)
  const delayed = useDelayedFlag(isPending)
  if (isPending) return delayed ? <RailSkeleton /> : null
  if (isError)
    return (
      <SectionError
        title={title}
        message={t("home.section_error")}
        hint={t("home.section_error_hint")}
        onRetry={() => {
          void refetch()
        }}
      />
    )
  return (
    <ListingRail
      title={title}
      href={href}
      listings={data.items}
      action={action}
      empty={empty}
      eager={eager}
    />
  )
}
