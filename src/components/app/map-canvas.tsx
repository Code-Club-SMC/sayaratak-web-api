import { lazy, Suspense, useState } from "react"
import { ClientOnly } from "@tanstack/react-router"

import { useT } from "@/lib/i18n/use-t"
import { usePrefs } from "@/lib/prefs"
import type { Geo } from "@/schemas/fields"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export type MapMarker = { id: string; lat: number; lng: number; label?: string }
export type MapView = {
  center: Geo
  zoom: number
  bounds: { north: number; south: number; east: number; west: number }
}
export type MapCanvasProps = {
  center: Geo
  zoom?: number
  markers?: MapMarker[]
  cluster?: boolean
  // A single draggable pin, for pickers.
  pin?: Geo | null
  onMove?: (view: MapView) => void
  onPick?: (point: Geo) => void
  label: string
  className?: string
}

// Leaflet touches `window` on import, so it loads in the browser only and never in the first bundle.
const Impl = lazy(() =>
  import("./map-canvas-impl").then((m) => ({ default: m.MapCanvasImpl }))
)

export function MapCanvas(props: MapCanvasProps) {
  const { t } = useT()
  const { dataSaver } = usePrefs()
  // With data saver on, no tile is requested until the person asks for the map.
  const [armed, setArmed] = useState(!dataSaver)
  const box = `relative h-72 w-full overflow-hidden rounded-lg bg-muted ${props.className ?? ""}`
  if (!armed)
    return (
      <div className={`${box} grid place-items-center`}>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setArmed(true)}
        >
          {t("form.load_map")}
        </Button>
      </div>
    )
  return (
    <div className={box}>
      <ClientOnly fallback={<Skeleton className="size-full" />}>
        <Suspense fallback={<Skeleton className="size-full" />}>
          <Impl {...props} />
        </Suspense>
      </ClientOnly>
    </div>
  )
}
