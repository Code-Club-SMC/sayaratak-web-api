import { useEffect, useState } from "react"

import { useT } from "@/lib/i18n/use-t"
import { HeroCarouselControls } from "../hero-carousel-controls"
import { InboxScene } from "./inbox-scene"
import { ListingScene } from "./listing-scene"
import { PlanScene } from "./plan-scene"
import { ViewsScene } from "./views-scene"

const slides = [
  { id: "views", Scene: ViewsScene },
  { id: "plan", Scene: PlanScene },
  { id: "listing", Scene: ListingScene },
  { id: "inbox", Scene: InboxScene },
]

// Four contained product previews share a stable grid and the hero's autoplay
// controls. Decorative scenes are hidden from assistive technology.
export function AuthCarousel() {
  const { t } = useT()
  const [index, setIndex] = useState(0)
  const [userPaused, setUserPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [hidden, setHidden] = useState(false)
  const paused = userPaused || hovered || focused || hidden

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      setUserPaused(true)
    const sync = () => setHidden(document.hidden)
    sync()
    document.addEventListener("visibilitychange", sync)
    return () => document.removeEventListener("visibilitychange", sync)
  }, [])

  const fade = (active: boolean) =>
    `col-start-1 row-start-1 transition-opacity duration-(--dur-sheet) ease-(--ease-standard) ${active ? "opacity-100" : "opacity-0"}`
  return (
    <section
      aria-roledescription="carousel"
      aria-label={t("auth.panel_label")}
      data-paused={paused ? "" : undefined}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHovered(false)}
      onFocus={(e) => e.target.matches(":focus-visible") && setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false)
      }}
      className="flex min-h-0 flex-1 flex-col items-center gap-6 overflow-y-auto px-6 py-8 xl:px-8 xl:py-12"
    >
      <div
        aria-live={paused ? "polite" : "off"}
        className="grid w-full max-w-lg shrink-0"
      >
        {slides.map((s, i) => (
          <div
            key={s.id}
            role="group"
            aria-roledescription="slide"
            aria-label={t("auth.slide_label", {
              number: i + 1,
              total: slides.length,
            })}
            aria-hidden={i !== index}
            className={`${fade(i === index)} flex min-w-0 flex-col gap-3`}
          >
            <p className="text-title font-semibold">
              {t(`auth.slide_${s.id}_title`)}
            </p>
            <p className="text-body text-muted-foreground">
              {t(`auth.slide_${s.id}_text`)}
            </p>
          </div>
        ))}
      </div>
      <div aria-hidden className="grid w-full max-w-lg shrink-0">
        {slides.map((s, i) => (
          <div
            key={s.id}
            data-auth-scene={s.id}
            className={`${fade(i === index)} flex min-w-0 flex-col gap-4`}
          >
            <s.Scene />
          </div>
        ))}
      </div>
      <HeroCarouselControls
        ids={slides.map((s) => s.id)}
        index={index}
        playing={!userPaused}
        onSelect={setIndex}
        onAdvance={() => setIndex((index + 1) % slides.length)}
        onToggle={() => setUserPaused(!userPaused)}
        className="mt-auto shrink-0 bg-foreground/70"
      />
    </section>
  )
}
