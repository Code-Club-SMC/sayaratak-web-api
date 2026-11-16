import { describe, expect, test } from "vitest"
import { stagePercent } from "@/features/admin-seed/progress"

describe("stagePercent", () => {
  test("100 percent requires a committed completed stage", () => {
    expect(stagePercent({ completed: 230, total: 230, complete: false })).toBe(
      99
    )
    expect(stagePercent({ completed: 230, total: 230, complete: true })).toBe(
      100
    )
    expect(stagePercent({ completed: 0, total: 0, complete: false })).toBeNull()
    expect(stagePercent({ completed: 0, total: 0, complete: true })).toBe(100)
  })

  test("returns null for non-integer, negative, or out of range inputs", () => {
    expect(
      stagePercent({ completed: -1, total: 10, complete: false })
    ).toBeNull()
    expect(
      stagePercent({ completed: 5, total: -1, complete: false })
    ).toBeNull()
    expect(
      stagePercent({ completed: 15, total: 10, complete: false })
    ).toBeNull()
    expect(
      stagePercent({ completed: 1.5, total: 10, complete: false })
    ).toBeNull()
    expect(
      stagePercent({ completed: 5, total: 10.5, complete: false })
    ).toBeNull()
  })

  test("calculates intermediate percentages capped at 99", () => {
    expect(stagePercent({ completed: 50, total: 100, complete: false })).toBe(
      50
    )
    expect(stagePercent({ completed: 1, total: 100, complete: false })).toBe(1)
    expect(stagePercent({ completed: 99, total: 100, complete: false })).toBe(
      99
    )
  })
})
