import { z } from "zod"

import { env } from "~/env"
import { db } from "~/shared/db/client"
import { log } from "~/shared/log/logger"
import { newId } from "~/shared/text/ids"
import { clock } from "~/shared/time/clock"

import * as q from "./outbox.queries"
import type { OutboxRow } from "./outbox.tables"
import { renderCode } from "./templates"
import { sendSmtp, transport } from "./transport"

const templateSchema = z.enum([
  "sign-in",
  "email-verification",
  "forget-password",
  "change-email",
  "admin-code",
])
const localeSchema = z.enum(["ar", "en"]).catch("ar")

export type MailTemplate = z.infer<typeof templateSchema>
/** What a code is for, in Better-Auth's emailOTP words. */
export type OtpPurpose = Exclude<MailTemplate, "admin-code">
export type Locale = z.infer<typeof localeSchema>

type CodeMail = {
  to: string
  template: MailTemplate
  locale: Locale
  code: string
}
export type SentMail = CodeMail & {
  subject: string
  text: string
  html: string
}

// A9 backoff for the outbox job: 1, 2, 4, 8 minutes, then it gives up.
const RETRY_MINUTES = [1, 2, 4, 8]
const MINUTE_MS = 60_000

/**
 * Mail sent while NODE_ENV is test, newest last. Tests read codes from here
 * instead of a mailbox (A13), after `flushMail()`.
 */
export const testInbox: SentMail[] = []
const running = new Set<Promise<void>>()

/**
 * The only way the API sends mail (A9). Each call writes an outbox row and
 * starts the delivery without waiting for it, so no answer waits on SMTP
 * (and its timing tells nothing). SMS later is a second implementation
 * behind the same calls.
 */
export const send = {
  // `locale` may still be loading (a user row lookup): it is awaited off the
  // request, with the rest of the delivery.
  otp(mail: {
    to: string
    code: string
    purpose: OtpPurpose
    locale: Locale | Promise<Locale>
  }) {
    queue({ ...mail, template: mail.purpose })
  },
  adminCode(user: { email: string; locale?: unknown }, code: string) {
    const locale = localeSchema.parse(user.locale)
    queue({ to: user.email, template: "admin-code", locale, code })
  },
}

/** Waits for every delivery started so far. Tests call it before reading `testInbox`. */
export async function flushMail() {
  await Promise.all(running)
}

/** Sends one outbox row; the outbox job (A10) calls it again for failed rows. */
export async function deliver(row: OutboxRow) {
  const mail: CodeMail = {
    to: row.to,
    template: templateSchema.parse(row.template),
    locale: localeSchema.parse(row.locale),
    code: row.payload.code ?? "",
  }
  try {
    await transmit({ ...mail, ...renderCode(mail) })
    await q.updateOutboxSent(db, row.id, clock.now())
  } catch (error) {
    const minutes = RETRY_MINUTES[row.attempts] ?? 0
    const sendAfter = new Date(clock.now().getTime() + minutes * MINUTE_MS)
    log.error("mail_failed", { id: row.id, attempt: row.attempts + 1, error })
    await q.updateOutboxFailed(db, row.id, { error: String(error), sendAfter })
  }
}

type QueuedMail = Omit<CodeMail, "locale"> & {
  locale: Locale | Promise<Locale>
}

function queue(mail: QueuedMail) {
  // A reserved `.invalid` address (Facebook accounts with no email) never
  // gets mail; nothing is written either.
  if (mail.to.endsWith(".invalid")) return
  const work = writeAndDeliver(mail)
  running.add(work)
  // The one fire-and-forget in the API (A17.5): the caller's answer never
  // waits on the database insert or on SMTP.
  void work.finally(() => running.delete(work))
}

async function writeAndDeliver(mail: QueuedMail) {
  try {
    const locale = await mail.locale
    const now = clock.now()
    const row = await q.insertOutbox(db, {
      id: newId("out"),
      channel: "email",
      to: mail.to,
      template: mail.template,
      locale,
      payload: { code: mail.code },
      sendAfter: now,
      createdAt: now,
    })
    if (row) await deliver(row)
  } catch (error) {
    log.error("mail_queue_failed", { template: mail.template, error })
  }
}

async function transmit(mail: SentMail) {
  if (transport) return sendSmtp(transport, mail)
  if (env.NODE_ENV === "test") {
    testInbox.push(mail)
    return
  }
  // Dev without SMTP (A9): the code goes to the log so the developer can type it.
  log.info("mail_dev", {
    to: mail.to,
    template: mail.template,
    code: mail.code,
  })
}
