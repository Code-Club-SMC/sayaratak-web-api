import { StatusBadge } from "@/components/app/status-badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useT } from "@/lib/i18n/use-t"
import type { Listing } from "@/schemas/listing"

// The moderation state. A rejected listing explains itself in a tooltip (hover or focus).
export function ReviewBadge({ listing }: { listing: Listing }) {
  const { t } = useT()
  if (listing.moderation !== "rejected")
    return <StatusBadge status={listing.moderation} />
  return (
    <Tooltip>
      <TooltipTrigger
        render={<button type="button" className="rounded-full" />}
      >
        <StatusBadge status="rejected" />
      </TooltipTrigger>
      <TooltipContent>
        {listing.rejectionReason
          ? t("manager.reason", { reason: listing.rejectionReason })
          : t("manager.no_reason")}
      </TooltipContent>
    </Tooltip>
  )
}
