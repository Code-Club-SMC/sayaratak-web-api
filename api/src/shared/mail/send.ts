import { env } from "~/env"
import { log } from "~/shared/log/logger"

/** What a code is for, in Better-Auth's emailOTP words. */
export type OtpPurpose =
  | "sign-in"
  | "email-verification"
  | "forget-password"
  | "change-email"

export type Locale = "ar" | "en"

export type SentMail = {
  to: string
  template: "otp" | "admin-code"
  code: string
  purpose?: OtpPurpose
  locale: Locale
}

/**
 * Mail sent while NODE_ENV is test, newest last. Tests read codes from here
 * instead of a mailbox (A13); nothing else may read it.
 */
export const testInbox: SentMail[] = []

/**
 * The only way the API sends mail (A9). SMS later is a second implementation
 * behind the same calls.
 */
export const send = {
  otp(mail: { to: string; code: string; purpose: OtpPurpose; locale: Locale }) {
    deliver({ ...mail, template: "otp" })
  },
  adminCode(user: { email: string; locale?: unknown }, code: string) {
    const locale = user.locale === "en" ? "en" : "ar"
    deliver({ to: user.email, template: "admin-code", code, locale })
  },
}

function deliver(mail: SentMail) {
  if (env.NODE_ENV === "test") {
    testInbox.push(mail)
    return
  }
  // Dev without SMTP (A9): the code goes to the log so the developer can type it.
  log.info("mail_dev", {
    to: mail.to,
    template: mail.template,
    purpose: mail.purpose,
    code: mail.code,
  })
}
