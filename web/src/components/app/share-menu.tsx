import { useSyncExternalStore } from "react"
import { Share2Icon } from "lucide-react"

import { useTrackEvent } from "@/features/listings/events"
import { useT } from "@/lib/i18n/use-t"
import { usePageUrl } from "@/lib/use-page-url"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/toast"

const noop = () => () => {}
const canShare = () => typeof navigator.share === "function"

// Facebook, Telegram and WhatsApp take a share URL. TikTok has none, so it copies the link and tells the person what to do.
export function ShareMenu({
  targetId,
  title,
  className,
}: {
  targetId: string
  title: string
  className?: string
}) {
  const { t } = useT()
  const url = usePageUrl()
  const native = useSyncExternalStore(noop, canShare, () => false)
  const { mutate: track } = useTrackEvent()
  const enc = encodeURIComponent
  const links = [
    {
      key: "listing.whatsapp",
      href: `https://wa.me/?text=${enc(`${title} ${url}`)}`,
    },
    {
      key: "listing.share_facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
    },
    {
      key: "listing.share_telegram",
      href: `https://t.me/share/url?url=${enc(url)}&text=${enc(title)}`,
    },
  ]
  const done = () => track({ type: "share", targetId })
  const copy = (message: string) => {
    void navigator.clipboard
      .writeText(url)
      .then(() => toast.add({ title: message }))
      .catch(() => toast.add({ title: t("toast.error_save") }))
    done()
  }
  const item = "min-h-11 md:min-h-10"
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" className={className} />}
      >
        <Share2Icon aria-hidden="true" strokeWidth={1.5} />
        {t("listing.share")}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {native && (
          <DropdownMenuItem
            className={item}
            onClick={() => {
              void navigator.share({ title, url }).then(done, () => {})
            }}
          >
            {t("listing.share_more")}
          </DropdownMenuItem>
        )}
        {links.map((l) => (
          <DropdownMenuItem
            key={l.key}
            className={item}
            onClick={done}
            render={
              <a href={l.href} target="_blank" rel="noopener noreferrer" />
            }
          >
            {t(l.key)}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem
          className={item}
          onClick={() => copy(t("toast.tiktok_copied"))}
        >
          {t("listing.share_tiktok")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className={item}
          onClick={() => copy(t("toast.link_copied"))}
        >
          {t("listing.share_copy")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
