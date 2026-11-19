import { render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"

const widths = (scroll: number, client: number) => {
  Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
    configurable: true,
    get: () => scroll,
  })
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get: () => client,
  })
}
const box = () =>
  render(
    <Table>
      <TableBody>
        <TableRow>
          <TableCell>Toyota</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ).container.querySelector("[data-slot=table-container]")!

afterEach(() => widths(0, 0))

describe("Table (step 11.7-r14)", () => {
  it("is a Tab stop only when it scrolls sideways", () => {
    widths(900, 390)
    expect(box().getAttribute("tabindex")).toBe("0")
  })
  it("adds no Tab stop when it fits", () => {
    widths(390, 390)
    expect(box().hasAttribute("tabindex")).toBe(false)
  })
})
