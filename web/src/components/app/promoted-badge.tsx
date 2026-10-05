import { useT } from "@/lib/i18n/use-t"
import { Badge } from "@/components/ui/badge"

// Amber means paid promotion and nothing else (A5).
export function PromotedBadge({ kind }: { kind: "sponsored" | "featured" }) {
  const { t } = useT()
  return <Badge variant="signal">{t(`listing.${kind}`)}</Badge>
}
