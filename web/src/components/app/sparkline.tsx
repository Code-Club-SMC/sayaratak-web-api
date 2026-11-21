// A thin trend line for a stat card; decoration only, the number beside it says the same.
// A period with nothing in it still draws its flat line, so every card in a row ends the same way.
export function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const max = Math.max(...values, 1)
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${27 - (v / max) * 24}`)
    .join(" ")
  return (
    <svg
      viewBox="0 0 100 28"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="h-7 w-full text-foreground/45"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
