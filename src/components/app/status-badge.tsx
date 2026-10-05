import { useT } from "@/lib/i18n/use-t"
import { Badge } from "@/components/ui/badge"

const variants = {
  available: "success",
  reserved: "warning",
  pending: "warning",
  sold: "muted",
  rented: "muted",
  rejected: "destructive",
  removed: "destructive",
} as const

export function StatusBadge({ status }: { status: keyof typeof variants }) {
  const { t } = useT()
  return <Badge variant={variants[status]}>{t(`status.${status}`)}</Badge>
}
