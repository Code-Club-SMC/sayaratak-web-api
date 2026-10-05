import { useT } from "@/lib/i18n/use-t"

// `current` starts at 1.
export function StepIndicator({
  current,
  total,
}: {
  current: number
  total: number
}) {
  const { t } = useT()
  return (
    <div className="flex flex-col gap-2">
      <p className="text-caption text-muted-foreground">
        {t("form.step_of", { current, total })}
      </p>
      <ol className="flex gap-1">
        {Array.from({ length: total }, (_, i) => (
          <li
            key={i}
            aria-current={i + 1 === current ? "step" : undefined}
            className={`h-1 flex-1 rounded-full ${i < current ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </ol>
    </div>
  )
}
