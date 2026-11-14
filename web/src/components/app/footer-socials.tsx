import { toWhatsappUrl } from "@sayaratak/shared/lib/phone"

import { useT } from "@/lib/i18n/use-t"
import {
  FacebookIcon,
  InstagramIcon,
  WhatsappIcon,
  XIcon,
  YoutubeIcon,
} from "./social-icons"

const socialLinks = [
  { key: "nav.facebook", href: "https://facebook.com", Icon: FacebookIcon },
  { key: "nav.x", href: "https://x.com", Icon: XIcon },
  { key: "nav.instagram", href: "https://instagram.com", Icon: InstagramIcon },
  { key: "nav.youtube", href: "https://youtube.com", Icon: YoutubeIcon },
]
const linkStyle =
  "flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-primary"

export function FooterSocials({ whatsapp }: { whatsapp?: string }) {
  const { t } = useT()
  return (
    <div className="flex flex-wrap gap-1">
      {socialLinks.map(({ key, href, Icon }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t(key)}
          className={linkStyle}
        >
          <Icon className="size-4" />
        </a>
      ))}
      {whatsapp && (
        <a
          href={toWhatsappUrl(whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("nav.whatsapp")}
          className={linkStyle}
        >
          <WhatsappIcon className="size-4" />
        </a>
      )}
    </div>
  )
}
