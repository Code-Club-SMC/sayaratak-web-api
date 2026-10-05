import { useEffect } from "react"
import L from "leaflet"
import "leaflet.markercluster"
import "leaflet/dist/leaflet.css"
import "leaflet.markercluster/dist/MarkerCluster.css"
import "leaflet.markercluster/dist/MarkerCluster.Default.css"
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet"

import { tileAttribution, tileUrl } from "@/lib/map"
import type { MapCanvasProps } from "./map-canvas"

// A divIcon avoids Leaflet's default marker images, which bundlers do not resolve.
const icon = L.divIcon({
  className: "",
  html: '<span style="display:block;width:20px;height:20px;border-radius:9999px;background:var(--primary);border:3px solid #fff;box-shadow:0 1px 4px rgb(0 0 0 / 0.4)"></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

function Events({ onMove, onPick }: Pick<MapCanvasProps, "onMove" | "onPick">) {
  const map = useMapEvents({
    click: (e) => onPick?.({ lat: e.latlng.lat, lng: e.latlng.lng }),
    // Keyboard users pin the center of the map; arrow keys pan it.
    keypress: (e) => {
      if (e.originalEvent.key === "Enter") {
        const c = map.getCenter()
        onPick?.({ lat: c.lat, lng: c.lng })
      }
    },
    moveend: () => {
      const c = map.getCenter()
      const b = map.getBounds()
      onMove?.({
        center: { lat: c.lat, lng: c.lng },
        zoom: map.getZoom(),
        bounds: {
          north: b.getNorth(),
          south: b.getSouth(),
          east: b.getEast(),
          west: b.getWest(),
        },
      })
    },
  })
  return null
}

// Follows the `center` prop when it changes from outside (a new city), but ignores the echo of the person's own panning.
function Recenter({ center, zoom }: Pick<MapCanvasProps, "center" | "zoom">) {
  const map = useMap()
  useEffect(() => {
    if (map.getCenter().distanceTo([center.lat, center.lng]) > 1)
      map.setView([center.lat, center.lng], zoom ?? map.getZoom())
  }, [center.lat, center.lng, zoom])
  return null
}

function Markers({
  markers,
  cluster,
}: Pick<MapCanvasProps, "markers" | "cluster">) {
  const map = useMap()
  useEffect(() => {
    const group = cluster ? L.markerClusterGroup() : L.layerGroup()
    for (const m of markers ?? []) {
      const marker = L.marker([m.lat, m.lng], { icon })
      if (m.label) marker.bindTooltip(m.label)
      group.addLayer(marker)
    }
    map.addLayer(group)
    return () => {
      map.removeLayer(group)
    }
  }, [map, markers, cluster])
  return null
}

export function MapCanvasImpl({
  center,
  zoom = 12,
  markers,
  cluster,
  pin,
  onMove,
  onPick,
  label,
}: MapCanvasProps) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      className="size-full"
      aria-label={label}
    >
      <TileLayer url={tileUrl} attribution={tileAttribution} />
      <Events onMove={onMove} onPick={onPick} />
      <Recenter center={center} zoom={zoom} />
      <Markers markers={markers} cluster={cluster} />
      {pin && (
        <Marker
          position={[pin.lat, pin.lng]}
          icon={icon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const p = (e.target as L.Marker).getLatLng()
              onPick?.({ lat: p.lat, lng: p.lng })
            },
          }}
        />
      )}
    </MapContainer>
  )
}
