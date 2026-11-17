import { describe, expect, it } from "bun:test"

import { renderNotice } from "./notice"

const payment = {
  item: { ar: "باقة بلس", en: "Plus plan" },
  itemType: "plan" as const,
  amount: 1_500_000,
  reference: "SY-123456",
  transactionRef: "TX987",
}
const link = "https://sayaratak.sd/en/dealer/billing"

describe("notice emails", () => {
  it("states what an approved plan bought, until when, and the payment details", () => {
    const mail = renderNotice(
      {
        ...payment,
        template: "payment-approved",
        run: { kind: "until", endsAt: "2026-12-17T10:00:00.000Z" },
      },
      "en",
      link
    )
    expect(mail.subject).toBe("Payment approved: Plus plan")
    for (const part of [
      "active until 17 December 2026",
      "1,500,000 SDG",
      "SY-123456",
      "TX987",
      link,
    ]) {
      expect(mail.html).toContain(part)
      expect(mail.text).toContain(part)
    }
    expect(mail.html).not.toMatch(/<img|<script/)
  })

  it("renders Arabic right to left with Latin digits and Khartoum dates", () => {
    const mail = renderNotice(
      {
        ...payment,
        template: "payment-approved",
        run: { kind: "until", endsAt: "2026-12-16T22:30:00.000Z" },
      },
      "ar",
      link
    )
    expect(mail.subject).toBe("تمت الموافقة على الدفع: باقة بلس")
    expect(mail.html).toContain('dir="rtl"')
    expect(mail.text).toContain("1,500,000 جنيه")
    // 22:30 UTC is already the 17th in Khartoum (UTC+2).
    expect(mail.text).toMatch(/17 ديسمبر 2026/)
  })

  it("puts the admin's reason in a rejection and escapes it", () => {
    const mail = renderNotice(
      {
        ...payment,
        itemType: "campaign",
        template: "payment-rejected",
        reason: "Amount <b>wrong</b>",
      },
      "en",
      link
    )
    expect(mail.subject).toBe("Payment not approved: Plus plan")
    expect(mail.text).toContain("Reason: Amount <b>wrong</b>")
    expect(mail.text).toContain("ad slots have been released")
    expect(mail.html).toContain("Amount &lt;b&gt;wrong&lt;/b&gt;")
    expect(mail.html).not.toContain("<b>wrong")
  })

  it("covers a campaign window, a bump and admin promotion changes", () => {
    const campaign = renderNotice(
      {
        ...payment,
        itemType: "campaign",
        template: "payment-approved",
        run: {
          kind: "window",
          startsAt: "2026-12-01T00:00:00.000Z",
          endsAt: "2026-12-15T00:00:00.000Z",
        },
      },
      "en",
      link
    )
    expect(campaign.text).toContain(
      "runs from 1 December 2026 to 15 December 2026"
    )
    expect(campaign.text).toContain("View your campaigns")
    const granted = renderNotice(
      {
        template: "promotion-granted",
        listing: "Hilux 2019",
        run: { kind: "bump" },
      },
      "en",
      link
    )
    expect(granted.subject).toBe("Your listing was moved to the top")
    expect(granted.text).not.toContain("Amount")
    const ended = renderNotice(
      {
        template: "promotion-ended",
        listing: "Hilux 2019",
        endedAt: "2026-11-17T10:00:00.000Z",
      },
      "en",
      link
    )
    expect(ended.text).toContain("“Hilux 2019” on 17 November 2026")
  })
})
