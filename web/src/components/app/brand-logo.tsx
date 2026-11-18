import { useEffect, useRef, useState } from "react"
import { Link } from "@tanstack/react-router"

import { useT } from "@/lib/i18n/use-t"
import { usePrefs } from "@/lib/prefs"

// The logo file is a 250 x 250 canvas with the artwork in a band about twice as wide as it is tall, so a 2:1 box with `object-cover` shows just the artwork.
// `compact` is the mark in the collapsed dashboard sidebar: same artwork in a 40 x 20 box, the text fallback shrinks to fit.
export function BrandLogo({ compact = false }: { compact?: boolean }) {
  const { t, locale } = useT()
  const { dataSaver } = usePrefs()
  const image = useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    if (image.current?.complete) setLoaded(image.current.naturalWidth > 0)
  }, [])
  return (
    <Link
      to="/$locale"
      params={{ locale }}
      preload={dataSaver ? false : "intent"}
      className={`relative flex shrink-0 items-center rounded-lg ${compact ? "h-5 w-10" : "h-12 w-24"}`}
    >
      <span
        className={`truncate font-semibold text-primary ${compact ? "text-caption" : "text-title"} ${loaded ? "invisible" : ""}`}
      >
        {t("nav.brand")}
      </span>
      <span className="sr-only">{t("nav.home")}</span>
      <img
        ref={image}
        src="/sayaratak-logo.svg"
        width={96}
        height={48}
        alt=""
        className={`absolute inset-0 h-full w-full object-cover ${loaded ? "" : "invisible"}`}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(false)}
      />
    </Link>
  )
}
