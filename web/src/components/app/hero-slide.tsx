import { useState } from "react"
import {
  ArrowRightIcon,
  BikeIcon,
  CarIcon,
  CarTaxiFrontIcon,
  TruckIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react"

import { useT } from "@/lib/i18n/use-t"
import { mediaSrc, mediaSrcSet } from "@/lib/media"
import type { Slide, SlideIcon } from "@/lib/slide"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"

const icons: Record<SlideIcon, LucideIcon> = {
  car: CarIcon,
  truck: TruckIcon,
  wrench: WrenchIcon,
  bike: BikeIcon,
  tuk: CarTaxiFrontIcon,
}

// One slide (owner design, 2026-11-17): white text at the start edge on the deep navy, the photo filling the end edge (mirrored for Arabic by `image.flip`, so its subject faces the text) and fading into the navy over its start edge (A5 gradient exception, see Deviations). On a phone the photo fills the slide under a navy layer. The bottom padding keeps the text clear of the dots and of the search card that overlaps the lower edge. The CTA link is stretched over the whole slide. Without a photo, or when it fails, a large outline icon stands in.
export function HeroSlide({
  slide,
  index,
  total,
  active,
  heading: Heading,
  onCtaClick,
}: {
  slide: Slide
  index: number
  total: number
  active: boolean
  heading: "h1" | "h2"
  onCtaClick: (slide: Slide) => void
}) {
  const { t } = useT()
  const [failed, setFailed] = useState(false)
  const { image } = slide
  const photo = image && !failed ? image : null
  const Icon = icons[slide.icon ?? "car"]
  const ad = slide.kind === "ad"
  const label = (ad && slide.advertiser) || slide.eyebrow
  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={t("nav.slide_of", { number: index + 1, total })}
      aria-hidden={!active}
      inert={!active}
      className="relative isolate flex min-h-[26rem] w-full shrink-0 items-center md:min-h-[28rem] md:items-end lg:min-h-[32rem]"
    >
      {photo ? (
        <div className="absolute inset-0 -z-10 overflow-hidden md:start-auto md:w-[62%]">
          <img
            ref={(img) => {
              if (img?.complete && img.naturalWidth === 0) setFailed(true)
            }}
            src={mediaSrc(photo.src, 1280)}
            srcSet={mediaSrcSet(photo.src, 1920)}
            sizes="(min-width: 768px) 62vw, 100vw"
            width={1600}
            height={900}
            alt={photo.alt}
            draggable={false}
            loading={index === 0 ? "eager" : "lazy"}
            fetchPriority={index === 0 ? "high" : undefined}
            decoding="async"
            onError={() => setFailed(true)}
            style={{ objectPosition: photo.objectPosition }}
            className={cn(
              "size-full object-cover",
              photo.flip && "-scale-x-100"
            )}
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-deep/75 md:start-0 md:end-auto md:w-1/2 md:bg-transparent md:bg-linear-to-r md:from-deep md:to-transparent md:rtl:bg-linear-to-l"
          />
        </div>
      ) : (
        <Icon
          aria-hidden
          strokeWidth={1}
          className="absolute end-[8%] top-1/2 -z-10 size-64 -translate-y-1/2 text-deep-foreground/10 md:size-96 rtl:-scale-x-100"
        />
      )}
      <div className="w-full px-4 pt-10 pb-[6.5rem] md:px-10 md:pt-12 md:pb-[8.5rem] lg:px-16">
        <div className="flex max-w-md flex-col items-start gap-3 md:gap-4 lg:max-w-lg">
          {(ad || label) && (
            <div className="flex items-center gap-2">
              {ad && <Badge variant="signal">{t("nav.ad_badge")}</Badge>}
              {label && (
                <span className="text-ui font-medium text-deep-accent md:text-lead">
                  {label}
                </span>
              )}
            </div>
          )}
          <Heading className="line-clamp-3 text-display font-semibold tracking-tight">
            {slide.title}
          </Heading>
          {slide.body && (
            <p className="line-clamp-2 text-body text-deep-foreground/85 md:text-lead">
              {slide.body}
            </p>
          )}
          <a
            href={slide.cta.href}
            rel={ad ? "sponsored noopener" : undefined}
            onClick={() => onCtaClick(slide)}
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-2 after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep-foreground"
            )}
          >
            {slide.cta.label}
            <ArrowRightIcon aria-hidden className="size-4 rtl:-scale-x-100" />
          </a>
        </div>
      </div>
    </div>
  )
}
