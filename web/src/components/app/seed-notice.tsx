import { useT } from "@/lib/i18n/use-t"

export function SeedNotice({ active }: { active: boolean }) {
  const { t } = useT()
  if (!active) return null
  return (
    <p
      data-testid="seed-notice"
      className="py-1.5 text-center text-caption text-muted-foreground"
    >
      {t("common.seed_notice")}
    </p>
  )
}
