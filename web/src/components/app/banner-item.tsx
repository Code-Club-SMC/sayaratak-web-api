import { useEffect, useRef, useState } from "react"

import { useT } from "@/lib/i18n/use-t"
import { bannerHref } from "@/lib/navigation"
import type { Banner } from "@/schemas/admin"
import { useTrackEvent } from "@/features/listings/events"

export function BannerItem({ banner }: { banner: Banner }) {
  const { t, locale } = useT()
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
      aria-label={t("nav.view_advertisement")}
      onClick={() => mutate({ type: "banner_click", targetId: banner.id })}
      className="relative block min-h-11 overflow-hidden rounded-lg bg-muted"
    >
      {!missing ? (
        <img
          ref={image}
          src={banner.imageUrl[locale]}
          width={1200}
          height={200}
          loading="lazy"
          decoding="async"
          alt=""
          onError={() => setMissing(true)}
          className="aspect-[6/1] w-full object-cover"
        />
      ) : (
        <span className="flex aspect-[6/1] min-h-11 items-center justify-center p-4 text-ui text-muted-foreground">
          {t("nav.advertisement")}
        </span>
      )}
    </a>
  )
}
