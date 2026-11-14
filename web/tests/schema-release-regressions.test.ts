import { expect, it } from "vitest"

import { portfolioUpdateSchema } from "@sayaratak/shared/schemas/inputs"
import { mechanicContactPlanSchema } from "@/features/onboarding/schemas"

it("validates portfolio updates with optional image replacement and bounded captions", () => {
  expect(
    portfolioUpdateSchema.parse({ caption: " Repaired gearbox " })
  ).toEqual({
    caption: "Repaired gearbox",
  })
  expect(
    portfolioUpdateSchema.safeParse({
      caption: "x".repeat(120),
      imageId: "upload-1",
    }).success
  ).toBe(true)
  for (const body of [
    {},
    { caption: " " },
    { caption: "x".repeat(121) },
    { caption: "Repaired gearbox", imageId: "" },
  ]) {
    expect(portfolioUpdateSchema.safeParse(body).success).toBe(false)
  }
})

it("validates mechanic contact/plan values without accepting malformed phones", () => {
  const body = {
    planId: "plan-1",
    phone: "+249912345678",
    whatsapp: "",
  }
  expect(mechanicContactPlanSchema.parse(body)).toEqual(body)
  expect(
    mechanicContactPlanSchema.safeParse({
      ...body,
      whatsapp: "+249912345679",
    }).success
  ).toBe(true)
  for (const invalid of [
    { ...body, planId: "" },
    { ...body, phone: "" },
    { ...body, phone: "0912345678" },
    { ...body, whatsapp: "not-a-phone" },
  ]) {
    expect(mechanicContactPlanSchema.safeParse(invalid).success).toBe(false)
  }
})
