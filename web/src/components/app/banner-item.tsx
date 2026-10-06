import { useEffect, useRef, useState } from "react"

import { useT } from "@/lib/i18n/use-t"
import { bannerHref } from "@/lib/navigation"
import { cn } from "@/lib/utils"
import type { Banner } from "@/schemas/admin"
import { useTrackEvent } from "@/features/listings/events"

// "hero" is the tall home banner (1600 x 400, shown first and loaded at once); "strip" is the 1200 x 200 banner of every other slot.
export function BannerItem({
  banner,
  variant = "strip",
}: {
  banner: Banner
  variant?: "strip" | "hero"
}) {
  const hero = variant === "hero"
  const shape = hero ? "aspect-[3/1] md:aspect-[4/1]" : "aspect-[6/1]"
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
      className={cn(
        "relative block min-h-11 overflow-hidden bg-muted",
        hero ? "rounded-xl md:rounded-2xl" : "rounded-lg"
      )}
    >
      {!missing ? (
        <img
          ref={image}
          src={banner.imageUrl[locale]}
          width={hero ? 1600 : 1200}
          height={hero ? 400 : 200}
          loading={hero ? "eager" : "lazy"}
          fetchPriority={hero ? "high" : undefined}
          decoding="async"
          alt=""
          onError={() => setMissing(true)}
          className={cn("w-full object-cover", shape)}
        />
      ) : (
        <span
          className={cn(
            "flex min-h-11 items-center justify-center p-4 text-ui text-muted-foreground",
            shape
          )}
        >
          {t("nav.advertisement")}
        </span>
      )}
    </a>
  )
}
