import { ArrowRightIcon } from "lucide-react"

import { useT } from "@/lib/i18n/use-t"
import { cn } from "@/lib/utils"
import type { Banner } from "@/schemas/admin"
import { Badge } from "@/components/ui/badge"

type Copy = NonNullable<Banner["copy"]>["en"]

// The photo sits at the end edge and is mirrored for Arabic, so its subject always faces the text. The crop keeps the banner's focal point in view.
function Photo({
  src,
  focus,
  eager,
  className,
}: {
  src: string
  focus: number
  eager: boolean
  className: string
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-deep-foreground/10",
        className
      )}
    >
      <img
        src={src}
        alt=""
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : undefined}
        decoding="async"
        style={{ objectPosition: `left ${focus}%` }}
        className="absolute inset-0 size-full object-cover rtl:-scale-x-100"
      />
    </div>
  )
}

// A banner is a photo with real text on top (A5b: flat deep green, no gradient). On the home hero the search card overlaps the banner's lower edge, so the text keeps clear of it; a phone drops the eyebrow and a tablet the body. A strip is a row on desktop and a compact card on a phone (small photo, two lines, a text link); the hero lays the text over the whole photo on a phone and beside it from md.  The hero's photo loads at once.
export function BannerCopy({
  banner,
  copy,
  src,
  hero,
}: {
  banner: Banner
  copy: Copy
  src: string
  hero: boolean
}) {
  const { t } = useT()
  const text = (
    <div
      className={cn(
        "flex min-w-0 flex-col justify-center gap-1",
        hero
          ? "relative z-10 h-full p-4 pb-12 md:w-[46%] md:gap-2 md:ps-10 md:pe-0 md:pb-14 lg:gap-4 lg:ps-16 lg:pb-16"
          : "md:gap-2 md:px-10 md:py-4"
      )}
    >
      <div
        className={cn("items-center gap-2", hero ? "hidden md:flex" : "flex")}
      >
        {banner.sponsored && (
          <Badge variant="signal">{t("nav.ad_badge")}</Badge>
        )}
        <span className="text-caption font-medium tracking-[0.12em] text-deep-accent uppercase rtl:tracking-normal">
          {copy.eyebrow}
        </span>
      </div>
      <p
        className={cn(
          "line-clamp-2 font-semibold text-balance",
          hero
            ? "text-lead md:text-title lg:text-hero"
            : "text-ui md:text-title"
        )}
      >
        {copy.heading}
      </p>
      <p
        className={cn(
          "hidden text-body text-deep-foreground/80",
          hero ? "lg:block" : "md:block"
        )}
      >
        {copy.body}
      </p>
      <span
        className={cn(
          "mt-1 inline-flex items-center gap-1.5 text-ui font-semibold motion-color md:mt-2 md:w-fit md:rounded-lg md:bg-deep-foreground md:px-4 md:text-deep md:group-hover:bg-deep-foreground/90",
          hero ? "md:h-11 md:px-5" : "md:h-9"
        )}
      >
        {copy.cta}
        <ArrowRightIcon aria-hidden className="size-4 rtl:-scale-x-100" />
      </span>
    </div>
  )
  return hero ? (
    <div className="relative h-full">
      <Photo
        src={src}
        focus={banner.focus}
        eager
        className="absolute inset-0 md:start-auto md:w-1/2"
      />
      <div aria-hidden className="absolute inset-0 bg-deep/70 md:hidden" />
      {text}
    </div>
  ) : (
    <div className="grid grid-cols-[4.5rem_1fr] items-center gap-3 p-3 md:min-h-36 md:grid-cols-[1fr_30%] md:gap-0 md:p-0">
      <Photo
        src={src}
        focus={banner.focus}
        eager={false}
        className="order-first aspect-square rounded-lg md:order-last md:aspect-auto md:h-full md:rounded-none"
      />
      {text}
    </div>
  )
}
