import { lazy, Suspense, useRef, useState } from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Maximize2Icon,
  PlayIcon,
} from "lucide-react"

import { useT } from "@/lib/i18n/use-t"
import { arrowStep, detailSizes } from "@/lib/media"
import { clamp, cn } from "@/lib/utils"
import type { Media } from "@/schemas/listing"
import { Button } from "@/components/ui/button"
import { useDirection } from "@/components/ui/direction"
import { GallerySlide } from "./gallery-slide"
import { MediaImage } from "./media-image"

const Lightbox = lazy(() =>
  import("./gallery-lightbox").then((m) => ({ default: m.GalleryLightbox }))
)

// A scroll-snap strip (touch swipe works natively), a thumbnail row and a full-screen view.
export function Gallery({
  items,
  alt,
  className,
}: {
  items: Media[]
  alt: string
  className?: string
}) {
  const { t } = useT()
  const dir = useDirection()
  const strip = useRef<HTMLDivElement>(null)
  const thumbs = useRef<(HTMLButtonElement | null)[]>([])
  const [index, setIndex] = useState(0)
  const [full, setFull] = useState(false)
  const last = items.length - 1

  const show = (to: number) => {
    setIndex(to)
    thumbs.current[to]?.scrollIntoView({ inline: "nearest", block: "nearest" })
  }
  const go = (to: number) => {
    const n = clamp(to, 0, last)
    show(n)
    strip.current?.children[n]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    })
  }
  // scrollLeft is negative in RTL, so compare its magnitude.
  const onScroll = () => {
    const el = strip.current
    if (!el?.clientWidth) return
    const n = clamp(
      Math.round(Math.abs(el.scrollLeft) / el.clientWidth),
      0,
      last
    )
    if (n !== index) show(n)
  }

  if (!items.length)
    return <MediaImage src={null} alt={alt} className={className} />
  return (
    <section
      aria-roledescription="carousel"
      aria-label={alt}
      className={cn("flex flex-col gap-2", className)}
    >
      <div
        className="relative"
        tabIndex={0}
        onKeyDown={(e) => {
          const step = arrowStep(e.key, dir)
          if (step) go(index + step)
        }}
      >
        <div
          ref={strip}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto rounded-lg [&::-webkit-scrollbar]:hidden"
        >
          {items.map((media, i) => (
            <div
              key={media.id}
              role="group"
              aria-roledescription="slide"
              aria-label={t("common.count_of", {
                current: i + 1,
                max: items.length,
              })}
              className="w-full shrink-0 snap-center"
            >
              <GallerySlide
                media={media}
                alt={`${alt} ${i + 1}`}
                sizes={detailSizes}
                priority={i === 0}
              />
            </div>
          ))}
        </div>
        <Button
          variant="secondary"
          size="icon"
          aria-label={t("common.previous")}
          disabled={index === 0}
          onClick={() => go(index - 1)}
          className="absolute start-2 top-1/2 -translate-y-1/2"
        >
          <ChevronLeftIcon className="rtl:-scale-x-100" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          aria-label={t("common.next")}
          disabled={index === last}
          onClick={() => go(index + 1)}
          className="absolute end-2 top-1/2 -translate-y-1/2"
        >
          <ChevronRightIcon className="rtl:-scale-x-100" />
        </Button>
        <span className="absolute start-2 bottom-2 rounded-full bg-card px-2 text-caption font-medium">
          {t("common.count_of", { current: index + 1, max: items.length })}
        </span>
        <Button
          variant="secondary"
          size="icon"
          aria-label={t("common.fullscreen")}
          onClick={() => setFull(true)}
          className="absolute end-2 bottom-2"
        >
          <Maximize2Icon />
        </Button>
      </div>
      <div className="flex gap-2 overflow-x-auto p-1">
        {items.map((media, i) => (
          <button
            key={media.id}
            type="button"
            ref={(el) => {
              thumbs.current[i] = el
            }}
            aria-label={t("common.photo_number", { number: i + 1 })}
            aria-current={i === index}
            onClick={() => go(i)}
            className={cn(
              "relative w-[72px] shrink-0 rounded-lg",
              i === index && "outline-2 outline-offset-2 outline-primary"
            )}
          >
            <MediaImage
              src={media.type === "video" ? media.posterUrl : media.url}
              placeholderColor={media.placeholderColor}
              alt=""
              sizes="72px"
            />
            {media.type === "video" && (
              <PlayIcon
                aria-hidden
                className="absolute inset-0 m-auto size-4 text-background"
              />
            )}
          </button>
        ))}
      </div>
      {full && (
        <Suspense>
          <Lightbox
            items={items}
            alt={alt}
            index={index}
            onIndex={go}
            onClose={() => setFull(false)}
          />
        </Suspense>
      )}
    </section>
  )
}
