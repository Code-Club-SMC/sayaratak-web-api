import { LocateFixedIcon } from "lucide-react"

import { radii } from "@/features/search/filters"
import { useT } from "@/lib/i18n/use-t"
import type { Geo } from "@/schemas/fields"
import { Button } from "@/components/ui/button"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

export type LocateStatus = "idle" | "locating" | "denied" | "failed"

// Next to the "Near you" title: ask for the device position, then pick how far to look. Without a position the rail follows the city.
export function LocationControl({
  geo,
  radius,
  status,
  cityName,
  onLocate,
  onRadius,
  onReset,
}: {
  geo: Geo | null
  radius: number
  status: LocateStatus
  cityName: string
  onLocate: () => void
  onRadius: (km: number) => void
  onReset: () => void
}) {
  const { t } = useT()
  if (geo)
    return (
      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect
          aria-label={t("search.radius")}
          value={radius}
          onChange={(e) => onRadius(Number(e.target.value))}
        >
          {radii.map((km) => (
            <NativeSelectOption key={km} value={km}>
              {t("search.radius_value", { km })}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button variant="ghost" onClick={onReset}>
          {t("home.use_city", { city: cityName })}
        </Button>
      </div>
    )
  const message =
    status === "denied"
      ? t("home.location_denied", { city: cityName })
      : status === "failed"
        ? t("home.location_failed", { city: cityName })
        : t("home.showing_city", { city: cityName })
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        disabled={status === "locating"}
        onClick={onLocate}
      >
        <LocateFixedIcon data-icon="inline-start" />
        {t("home.use_my_location")}
      </Button>
      <p role="status" className="text-caption text-muted-foreground">
        {message}
      </p>
    </div>
  )
}
