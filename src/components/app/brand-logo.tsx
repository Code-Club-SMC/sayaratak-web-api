import { useEffect, useRef, useState } from "react"
import { Link } from "@tanstack/react-router"

import { useT } from "@/lib/i18n/use-t"
import { usePrefs } from "@/lib/prefs"

export function BrandLogo() {
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
      aria-label={t("nav.home")}
      className="relative flex h-12 w-24 shrink-0 items-center rounded-lg"
    >
      <span
        className={`text-title font-semibold text-primary ${loaded ? "invisible" : ""}`}
      >
        {t("nav.brand")}
      </span>
      <img
        ref={image}
        src="/brand/logo.svg"
        width={96}
        height={48}
        alt=""
        className={`absolute inset-0 h-full w-full bg-card object-contain ${loaded ? "" : "invisible"}`}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(false)}
      />
    </Link>
  )
}
