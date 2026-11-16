import { beforeEach, expect, it } from "vitest"
import { screen } from "@testing-library/react"

import { ContactActions } from "@/components/app/contact-actions"
import { FavoriteButton } from "@/components/app/favorite-button"
import { ReportDialog } from "@/components/app/report-dialog"
import { listingSchema } from "@sayaratak/shared/schemas/listing"
import { withheldContactSchema } from "@sayaratak/shared/schemas/interaction"
import { db, resetDb } from "@/mocks/db"
import { renderShell } from "./shell-render"

beforeEach(() => {
  resetDb()
})

it.each(["en", "ar"] as const)(
  "preview contact has a localized reason and no contact links in %s",
  async (locale) => {
    const rendered = await renderShell(
      <ContactActions
        target={{ type: "listing", id: "lsd000", title: "Preview" }}
        interactionMode="preview"
        phone={null}
        whatsapp={null}
        methods={[]}
        showPhone={false}
      />,
      { locale }
    )
    expect(rendered.container.querySelector('a[href^="tel:"]')).toBeNull()
    expect(rendered.container.querySelector('a[href*="wa.me"]')).toBeNull()
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(rendered.container.textContent).toContain(
      locale === "ar"
        ? "التواصل والتفاعلات الجديدة غير متاحة"
        : "Contact and new interactions are unavailable"
    )
  }
)

it("preview save and report controls are disabled with an accessible reason", async () => {
  await renderShell(
    <>
      <FavoriteButton listingId="lsd000" interactionMode="preview" />
      <ReportDialog listingId="lsd000" interactionMode="preview" />
    </>
  )
  const controls = screen.getAllByRole("button", {
    name: "Contact and new interactions are unavailable for this demo content.",
  })
  expect(controls).toHaveLength(2)
  for (const control of controls) {
    expect((control as HTMLButtonElement).disabled).toBe(true)
  }
})

it("wire parsing defaults legacy live content but requires exact withheld preview contact", () => {
  const legacy = { ...db.listings[0] }
  const { interactionMode: _mode, ...oldWire } = legacy
  expect(listingSchema.parse(oldWire).interactionMode).toBe("live")
  expect(
    withheldContactSchema.parse({
      phone: null,
      whatsapp: null,
      showPhone: false,
      methods: [],
    }).phone
  ).toBeNull()
  expect(
    withheldContactSchema.safeParse({
      phone: null,
      whatsapp: null,
      showPhone: false,
      methods: ["chat"],
    }).success
  ).toBe(false)
  expect(
    listingSchema.safeParse({
      ...oldWire,
      interactionMode: "preview",
      contact: undefined,
    }).success
  ).toBe(false)
  expect(
    listingSchema.safeParse({
      ...oldWire,
      interactionMode: "preview",
    }).success
  ).toBe(false)
})
