import { useState } from "react"

import { useT } from "@/lib/i18n/use-t"
import { usePrefs } from "@/lib/prefs"

export function FooterArt() {
  const { t } = useT()
  const { dataSaver } = usePrefs()
  const [failed, setFailed] = useState(false)
  return (
    <div
      aria-hidden="true"
      dir="ltr"
      className="pointer-events-none grid pt-8 select-none"
    >
      <p className="col-start-1 row-start-1 text-center text-[clamp(3rem,14vw,11rem)] leading-none font-semibold text-foreground/10">
        {t("nav.footer_wordmark")}
      </p>
      {!dataSaver && !failed && (
        <picture className="col-start-1 row-start-1 mx-auto mt-[clamp(2rem,6vw,5rem)] w-full max-w-5xl">
          <source srcSet="/images/footer-car.webp" type="image/webp" />
          <img
            src="/images/Graphite Toyota-Inspired Sedan Profile.png"
            width={2048}
            height={768}
            alt=""
            loading="lazy"
            decoding="async"
            className="block h-auto w-full"
            onError={() => setFailed(true)}
          />
        </picture>
      )}
    </div>
  )
}
