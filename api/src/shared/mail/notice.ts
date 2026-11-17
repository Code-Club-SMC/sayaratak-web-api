import type { Bilingual } from "@sayaratak/shared/schemas/fields"

import type { Locale } from "./send"
import { BRAND, frame, type RenderedMail } from "./templates"
import { NOTICE_WORDS, type NoticeWords } from "./notice-words"

/** What an approval started: a plan or Featured until a date, a campaign's dates, a bump, or nothing new. */
export type NoticeRun =
  | { kind: "until"; endsAt: string }
  | { kind: "window"; startsAt: string; endsAt: string }
  | { kind: "bump" }
  | { kind: "none" }

type Payment = {
  item: Bilingual
  itemType: "plan" | "promotion" | "campaign"
  amount: number
  reference?: string
  transactionRef?: string
}

/**
 * A payment decision or an admin promotion change, mailed to the person it is
 * about. Stored in the outbox row as is, so a retry renders the same mail.
 */
export type Notice =
  | (Payment & { template: "payment-approved"; run: NoticeRun })
  | (Payment & { template: "payment-rejected"; reason: string })
  | { template: "promotion-granted"; listing: string; run: NoticeRun }
  | { template: "promotion-ended"; listing: string; endedAt: string }
export type NoticeTemplate = Notice["template"]

const ZONE = "Africa/Khartoum"

/** Latin digits, Gregorian calendar and Khartoum time, as the web app shows them. */
export function noticeFormat(locale: Locale) {
  const tag = locale === "ar" ? "ar-SD" : "en-GB"
  const date = new Intl.DateTimeFormat(tag, {
    dateStyle: "long",
    timeZone: ZONE,
    numberingSystem: "latn",
    calendar: "gregory",
  })
  const number = new Intl.NumberFormat(tag, { numberingSystem: "latn" })
  return {
    locale,
    date: (iso: string) => date.format(new Date(iso)),
    money: (sdg: number) =>
      `${number.format(sdg)} ${locale === "ar" ? "جنيه" : "SDG"}`,
  }
}

type Copy = {
  subject: string
  heading: string
  lines: string[]
  button: string
}
type Format = ReturnType<typeof noticeFormat>

function runLine(w: NoticeWords, fmt: Format, notice: Notice): string {
  if (notice.template !== "payment-approved") return ""
  const { run } = notice
  if (run.kind === "window")
    return w.approved.campaign(fmt.date(run.startsAt), fmt.date(run.endsAt))
  if (run.kind === "bump") return w.approved.bump
  if (run.kind === "none") return ""
  const until = fmt.date(run.endsAt)
  return notice.itemType === "plan"
    ? w.approved.plan(until)
    : w.approved.promotion(until)
}

function copyOf(w: NoticeWords, fmt: Format, notice: Notice): Copy {
  switch (notice.template) {
    case "payment-approved":
    case "payment-rejected": {
      const item = notice.item[fmt.locale]
      const button =
        notice.itemType === "campaign" ? w.button.campaigns : w.button.billing
      if (notice.template === "payment-rejected")
        return {
          subject: w.rejected.subject(item),
          heading: w.rejected.heading,
          lines: [w.rejected.intro(item), w.rejected.next[notice.itemType]],
          button,
        }
      return {
        subject: w.approved.subject(item),
        heading: w.approved.heading,
        lines: [w.approved.intro(item), runLine(w, fmt, notice)],
        button,
      }
    }
    case "promotion-granted": {
      const { run } = notice
      const part =
        run.kind === "until"
          ? w.featured
          : { title: w.bumped.title, lines: w.bumped.lines }
      const lines =
        run.kind === "until"
          ? w.featured.lines(notice.listing, fmt.date(run.endsAt))
          : w.bumped.lines(notice.listing)
      return {
        subject: part.title,
        heading: part.title,
        lines,
        button: w.button.listings,
      }
    }
    case "promotion-ended":
      return {
        subject: w.ended.title,
        heading: w.ended.title,
        lines: w.ended.lines(notice.listing, fmt.date(notice.endedAt)),
        button: w.button.listings,
      }
  }
}

function detailRows(w: NoticeWords, fmt: Format, notice: Notice) {
  if (!("amount" in notice)) return []
  return [
    [w.amount, fmt.money(notice.amount)],
    [w.reference, notice.reference],
    [w.transactionRef, notice.transactionRef],
  ].filter((row): row is [string, string] => Boolean(row[1]))
}

const esc = Bun.escapeHTML

function detailTable(rows: [string, string][], locale: Locale) {
  if (rows.length === 0) return ""
  const align = locale === "ar" ? "left" : "right"
  const cells = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 0;color:#535f73;border-bottom:1px solid #e3e7ed">${label}</td><td dir="ltr" style="padding:8px 0;font-weight:bold;border-bottom:1px solid #e3e7ed;text-align:${align}">${esc(value)}</td></tr>`
    )
    .join("")
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;font-size:14px;border-collapse:collapse">${cells}</table>`
}

/** One notice email: what happened, what it means now, the payment details and one button to `link` (absolute, in the recipient's language). */
export function renderNotice(
  notice: Notice,
  locale: Locale,
  link: string
): RenderedMail {
  const w = NOTICE_WORDS[locale]
  const fmt = noticeFormat(locale)
  const copy = copyOf(w, fmt, notice)
  const lines = copy.lines.filter(Boolean)
  const rows = detailRows(w, fmt, notice)
  const reason =
    notice.template === "payment-rejected" ? notice.reason : undefined
  const paragraphs = lines
    .map((line) => `<p style="margin:0 0 16px;font-size:16px">${esc(line)}</p>`)
    .join("\n")
  const reasonBox = reason
    ? `<p style="margin:0 0 16px;padding:12px 16px;background-color:#fdf1f0;border-inline-start:4px solid #c4372b;font-size:15px"><strong>${w.reason}</strong> <span dir="auto">${esc(reason)}</span></p>`
    : ""
  const button = `<p style="margin:0 0 8px"><a href="${esc(link)}" style="display:inline-block;padding:12px 24px;background-color:#3659e3;color:#ffffff;text-decoration:none;font-weight:bold;border-radius:6px">${copy.button}</a></p>`
  const html = frame({
    locale,
    heading: esc(copy.heading),
    body: [paragraphs, reasonBox, detailTable(rows, locale), button].join("\n"),
    footer: w.footer,
  })
  const text = [
    BRAND[locale],
    copy.heading,
    ...lines,
    reason && `${w.reason} ${reason}`,
    ...rows.map(([label, value]) => `${label} ${value}`),
    `${copy.button}: ${link}`,
    w.footer,
  ].filter(Boolean)
  return { subject: copy.subject, text: `${text.join("\n\n")}\n`, html }
}
