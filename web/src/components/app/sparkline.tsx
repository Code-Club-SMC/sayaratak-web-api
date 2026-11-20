// A tiny trend line for a stat card; decoration only, the number beside it says the same.
// A light area under the line and a dot on the newest point; nothing at all when every point is 0 (a flat line on the floor reads as broken).
export function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2 || values.every((v) => v === 0)) return null
  const max = Math.max(...values, 1)
  const xy = values.map(
    (v, i) => [(i / (values.length - 1)) * 100, 30 - (v / max) * 26] as const
  )
  const points = xy.map(([x, y]) => `${x},${y}`).join(" ")
  const [endX, endY] = xy[xy.length - 1] ?? [100, 30]
  return (
    <svg
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="h-8 w-full overflow-visible text-primary"
    >
      <polygon
        points={`0,32 ${points} 100,32`}
        fill="currentColor"
        fillOpacity={0.1}
      />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      {/* The dot would stretch with the box, so a zero-length round-capped line draws it at a fixed size. */}
      <line
        x1={endX}
        y1={endY}
        x2={endX}
        y2={endY}
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
