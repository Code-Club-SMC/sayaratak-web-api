export function stagePercent(input: {
  completed: number
  total: number
  complete: boolean
}): number | null {
  if (
    !Number.isInteger(input.completed) ||
    !Number.isInteger(input.total) ||
    input.completed < 0 ||
    input.total < 0 ||
    input.completed > input.total
  ) {
    return null
  }
  if (input.complete) return 100
  if (input.total === 0) return null
  const percent = Math.floor((input.completed / input.total) * 100)
  return Math.min(percent, 99)
}
