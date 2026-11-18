// A tiny trend line for a stat card; decoration only, the number beside it says the same.
export function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const max = Math.max(...values, 1)
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${24 - (v / max) * 22}`)
    .join(" ")
  return (
    <svg
      viewBox="0 0 100 24"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="h-6 w-full text-primary"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
