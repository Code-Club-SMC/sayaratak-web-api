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

// One slide (owner design, 2026-11-17): text at the start edge on the light card, the photo as a rounded inset at the end edge (mirrored for Arabic by `image.flip`, so its subject faces the text). On a phone the photo sits on top and the text below it. The CTA link is stretched over the whole slide. Without a photo, or when it fails, the photo box shows the slide's icon.
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
      className="relative flex w-full shrink-0 flex-col gap-4 p-3 md:flex-row md:items-center md:gap-0 md:p-6"
    >
      <div className="relative grid aspect-video shrink-0 place-items-center overflow-hidden rounded-lg bg-muted md:order-last md:aspect-auto md:w-[56%] md:self-stretch">
        {photo ? (
          <img
            ref={(img) => {
              if (img?.complete && img.naturalWidth === 0) setFailed(true)
            }}
            src={mediaSrc(photo.src, 960)}
            srcSet={mediaSrcSet(photo.src, 1280)}
            sizes="(min-width: 768px) 56vw, 100vw"
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
              "absolute inset-0 size-full object-cover",
              photo.flip && "-scale-x-100"
            )}
          />
        ) : (
          <Icon
            aria-hidden
            strokeWidth={1}
            className="size-24 text-muted-foreground/40 md:size-40 rtl:-scale-x-100"
          />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 px-1 pb-1 md:gap-3 md:px-10 lg:gap-4 lg:px-14">
        {(ad || label) && (
          <div className="flex items-center gap-2">
            {ad && <Badge variant="signal">{t("nav.ad_badge")}</Badge>}
            {label && (
              <span className="text-ui font-semibold text-primary">
                {label}
              </span>
            )}
          </div>
        )}
        <Heading className="line-clamp-2 text-title font-semibold text-balance md:text-page lg:text-hero">
          {slide.title}
        </Heading>
        {slide.body && (
          <p className="line-clamp-2 text-body text-muted-foreground lg:text-lead">
            {slide.body}
          </p>
        )}
        <a
          href={slide.cta.href}
          rel={ad ? "sponsored noopener" : undefined}
          onClick={() => onCtaClick(slide)}
          className={cn(
            buttonVariants({ size: "lg" }),
            "mt-1 w-fit after:absolute after:inset-0 after:content-[''] md:mt-2"
          )}
        >
          {slide.cta.label}
          <ArrowRightIcon aria-hidden className="size-4 rtl:-scale-x-100" />
        </a>
      </div>
    </div>
  )
}
