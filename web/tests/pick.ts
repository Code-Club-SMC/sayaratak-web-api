import { fireEvent, screen } from "@testing-library/react"

// Opens a shadcn Select (Base UI) and chooses one option by its visible name.
export async function pick(trigger: HTMLElement, option: string) {
  fireEvent.pointerDown(trigger, { button: 0, pointerType: "mouse" })
  fireEvent.mouseDown(trigger, { button: 0 })
  const item = await screen.findByRole("option", { name: option })
  fireEvent.mouseMove(item)
  fireEvent.pointerUp(item, { button: 0, pointerType: "mouse" })
  fireEvent.mouseUp(item, { button: 0 })
  fireEvent.click(item)
}
