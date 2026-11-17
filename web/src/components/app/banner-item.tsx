import { useEffect, useRef, useState } from "react"

import { useT } from "@/lib/i18n/use-t"
import { mediaSrc, mediaSrcSet } from "@/lib/media"
import { bannerHref } from "@/lib/navigation"
import type { Banner } from "@sayaratak/shared/schemas/admin"
import { useTrackEvent } from "@/features/listings/events"
import { Badge } from "@/components/ui/badge"

// The banner of every slot but the home hero (that is `HeroCarousel`): one image, the whole banner is the link (owner decision, 2026-11-17). A banner's `copy`, when present, only names the link for screen readers; a paid banner carries the Ad badge on the image. The photo's `focus` keeps its focal point in the 6:1 crop.
export function BannerItem({ banner }: { banner: Banner }) {
  const { t, locale } = useT()
  const copy = banner.copy?.[locale]
  const link = useRef<HTMLAnchorElement>(null)
  const image = useRef<HTMLImageElement>(null)
  const tracked = useRef(false)
  const [missing, setMissing] = useState(false)
  const { mutate } = useTrackEvent()
  const href = bannerHref(banner.href, locale)
  useEffect(() => {
    if (image.current?.complete && image.current.naturalWidth === 0)
      setMissing(true)
  }, [])
  useEffect(() => {
    const element = link.current
    if (!element || !href) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!tracked.current && entries.some((entry) => entry.isIntersecting)) {
          tracked.current = true
          mutate({ type: "banner_view", targetId: banner.id })
          observer.disconnect()
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [banner.id, href, mutate])
  if (!href) return null
  return (
    <a
      ref={link}
      href={href}
      aria-label={copy?.heading ?? t("nav.view_advertisement")}
      onClick={() => mutate({ type: "banner_click", targetId: banner.id })}
      className="group relative block min-h-11 overflow-hidden rounded-xl bg-muted motion-fade active:opacity-90"
    >
      {!missing ? (
        <img
          ref={image}
          src={mediaSrc(banner.imageUrl[locale], 1280)}
          srcSet={mediaSrcSet(banner.imageUrl[locale], 1280)}
          sizes="100vw"
          width={1200}
          height={200}
          loading="lazy"
          decoding="async"
          alt=""
          onError={() => setMissing(true)}
          style={{ objectPosition: `center ${banner.focus}%` }}
          className="aspect-[6/1] w-full object-cover"
        />
      ) : (
        <span className="flex aspect-[6/1] min-h-11 items-center justify-center p-4 text-ui text-muted-foreground">
          {t("nav.advertisement")}
        </span>
      )}
      {banner.sponsored && (
        <Badge variant="signal" className="absolute end-2 top-2">
          {t("nav.ad_badge")}
        </Badge>
      )}
    </a>
  )
}
