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
      className="@container pointer-events-none grid pt-8 select-none"
    >
      <p className="col-start-1 row-start-1 origin-top scale-y-150 text-center text-[18cqw] leading-none font-bold tracking-tighter text-foreground/10">
        {t("nav.footer_wordmark")}
      </p>
      {!dataSaver && !failed && (
        <picture className="col-start-1 row-start-1 mx-auto mt-[11cqw] w-full max-w-5xl">
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
