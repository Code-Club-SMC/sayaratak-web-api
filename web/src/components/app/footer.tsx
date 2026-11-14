import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Mail, Phone } from "lucide-react"

import { useT } from "@/lib/i18n/use-t"
import { marketplaceLinks, serviceLinks } from "@/lib/navigation"
import { toWhatsappUrl } from "@sayaratak/shared/lib/phone"
import { siteQuery } from "@/features/pages/queries"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { BrandIcon } from "./brand-icon"
import { BrandLogo } from "./brand-logo"
import { FooterArt } from "./footer-art"
import { FooterSocials } from "./footer-socials"
import { LanguageSwitcher } from "./language-switcher"
import { ShellLink } from "./shell-link"

const groups = [
  { key: "nav.marketplace", links: marketplaceLinks },
  { key: "nav.services", links: serviceLinks },
  {
    key: "nav.company",
    links: [
      { key: "nav.about", path: "/about" },
      { key: "nav.contact", path: "/contact" },
    ],
  },
  {
    key: "nav.legal",
    links: [
      { key: "nav.privacy", path: "/privacy" },
      { key: "nav.terms", path: "/terms" },
    ],
  },
]

export function Footer() {
  const { t } = useT()
  const { data, isPending, isError, refetch } = useQuery(siteQuery)
  const [delayed, setDelayed] = useState(false)
  useEffect(() => {
    if (!isPending) return
    const timeout = window.setTimeout(() => setDelayed(true), 150)
    return () => window.clearTimeout(timeout)
  }, [isPending])
  const contact = data?.contact
  return (
    <footer className="mt-8 overflow-hidden rounded-xl bg-card pt-8 [view-transition-name:site-footer] md:mt-12 md:pt-12">
      <div className="mx-auto max-w-[1200px] px-4 md:px-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="max-w-sm space-y-2">
            <BrandLogo />
            <p className="text-caption">
              <span className="text-muted-foreground">
                {t("nav.brand_tagline")}
              </span>
            </p>
            <FooterSocials whatsapp={contact?.whatsapp} />
            <div className="flex flex-col items-start gap-2">
              {isPending && delayed && (
                <Skeleton
                  aria-label={t("nav.loading_contact")}
                  className="h-10 w-72 max-w-full"
                />
              )}
              {contact && (
                <address className="flex flex-col items-start gap-2 not-italic">
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      className="inline-flex min-h-11 items-center gap-2 rounded-lg text-ui text-muted-foreground hover:text-primary"
                    >
                      <Phone
                        className="size-4 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      <bdi>{contact.phone}</bdi>
                    </a>
                  )}
                  {contact.whatsapp && (
                    <a
                      href={toWhatsappUrl(contact.whatsapp)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-lg text-ui text-muted-foreground hover:text-primary"
                    >
                      <BrandIcon
                        name="whatsapp"
                        className="size-4 shrink-0 text-[#25d366]"
                      />
                      <span>{t("nav.whatsapp")}</span>
                    </a>
                  )}
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="inline-flex min-h-11 items-center gap-2 rounded-lg text-ui text-muted-foreground hover:text-primary"
                    >
                      <Mail
                        className="size-4 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      <bdi>{contact.email}</bdi>
                    </a>
                  )}
                </address>
              )}
              {isError && (
                <div
                  role="status"
                  className="flex items-center gap-2 text-caption"
                >
                  <span className="text-destructive">
                    {t("nav.contact_error")}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      void refetch()
                    }}
                  >
                    {t("common.retry")}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <nav
            aria-label={t("nav.footer")}
            className="grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-4"
          >
            {groups.map((group) => (
              <div key={group.key}>
                <h2 className="mb-3 text-caption text-muted-foreground">
                  {t(group.key)}
                </h2>
                <ul>
                  {group.links.map((link) => (
                    <li key={link.key}>
                      <ShellLink
                        path={link.path}
                        className="inline-flex min-h-11 min-w-11 items-center rounded-lg text-ui text-foreground hover:text-primary"
                      >
                        {t(link.key)}
                      </ShellLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-border pt-6 md:mt-12 md:flex-row md:items-center md:justify-between">
          <p className="text-caption text-muted-foreground">
            {t("nav.copyright")}
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <span className="text-caption text-muted-foreground">
              {t("nav.region_language")}
            </span>
            <LanguageSwitcher />
          </div>
        </div>
        <FooterArt />
      </div>
    </footer>
  )
}
