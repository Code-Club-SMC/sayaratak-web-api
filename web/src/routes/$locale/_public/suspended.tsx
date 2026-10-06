import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { StatePanel } from "@/components/app/state-panel"
import { buttonVariants } from "@/components/ui/button"
import { siteQuery } from "@/features/pages/queries"
import { getCopy } from "@/lib/i18n/server"
import { useT } from "@/lib/i18n/use-t"
import { toWhatsappUrl } from "@/lib/phone"
import { buildHead } from "@/lib/seo"

// Where a signed-in banned account lands (see `$locale/route.tsx`). Step 6.8 adds the other static pages.
export const Route = createFileRoute("/$locale/_public/suspended")({
  loader: async ({ context }) => {
    const [title = "", description = ""] = await getCopy({
      data: {
        locale: context.locale,
        keys: ["auth.suspended_title", "auth.account_suspended"],
      },
    })
    return { title, description, locale: context.locale }
  },
  head: ({ loaderData }) =>
    loaderData
      ? buildHead({ ...loaderData, path: "/suspended", noindex: true })
      : {},
  component: Suspended,
})

function Suspended() {
  const { t } = useT()
  const contact = useQuery(siteQuery).data?.contact
  const link = buttonVariants({ variant: "outline" })
  return (
    <StatePanel
      title={t("auth.suspended_title")}
      body={t("auth.account_suspended")}
    >
      {contact?.email && (
        <a href={`mailto:${contact.email}`} className={link}>
          <bdi>{contact.email}</bdi>
        </a>
      )}
      {contact?.phone && (
        <a href={`tel:${contact.phone}`} className={link}>
          <bdi>{contact.phone}</bdi>
        </a>
      )}
      {contact?.whatsapp && (
        <a href={toWhatsappUrl(contact.whatsapp)} className={link}>
          {t("nav.whatsapp")}
        </a>
      )}
    </StatePanel>
  )
}
