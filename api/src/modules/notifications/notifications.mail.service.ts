import { env } from "~/env"
import type { Executor } from "~/shared/db/tx"
import type { Notice } from "~/shared/mail/notice"
import { send } from "~/shared/mail/send"
import * as auth from "~/modules/auth/auth.service"
import { getListingHead } from "~/modules/listings/listings.service"

import { toNotificationHref } from "./notifications.mapper"

/**
 * Emails a payment decision or an admin promotion change to the person it is
 * about, in their saved language, with a link to the page it concerns (`href`
 * as `notify` takes it: "/billing", "/ads", "/listings"). Always sent: the
 * notification switches silence the bell and push only, never the outcome of
 * money. Nothing is sent to a deleted account or a synthetic seed owner.
 */
export async function mailNotice(
  ex: Executor,
  message: {
    userId: string | null
    href: string
    notice: Notice
  }
) {
  if (!message.userId) return
  const [recipient] = await auth.listUsers(ex, [message.userId])
  if (!recipient) return
  const locale = recipient.locale === "en" ? "en" : "ar"
  const path = toNotificationHref(recipient.role, message.href)
  await send.notice(ex, {
    to: recipient.email,
    locale,
    notice: message.notice,
    link: `${env.WEB_ORIGIN}/${locale}${path}`,
  })
}

/** `mailNotice` to the owner of a listing, with the listing's title; nothing for an unknown listing. */
export async function mailListingOwner(
  ex: Executor,
  listingId: string,
  notice: (title: string) => Notice
) {
  const head = await getListingHead(ex, listingId)
  if (head)
    await mailNotice(ex, {
      userId: head.ownerUserId,
      href: "/listings",
      notice: notice(head.title),
    })
}
