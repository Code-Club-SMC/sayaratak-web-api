import { ArrowRightIcon } from "lucide-react"

import { useT } from "@/lib/i18n/use-t"
import { mediaSrc, mediaSrcSet } from "@/lib/media"
import { cn } from "@/lib/utils"
import type { Banner } from "@sayaratak/shared/schemas/admin"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"

type Copy = NonNullable<Banner["copy"]>["en"]

// A strip banner, the home hero's design made compact (owner decision, 2026-11-17): text and button at the start edge, the photo as a rounded inset at the end edge, mirrored for Arabic so its subject faces the text. In a narrow box (a phone, the listing aside) the photo sits on top. It follows its box through a container query, so the same markup fits every slot and the previews. The parent supplies the link and the background.
export function BannerCopy({
  banner,
  copy,
  src,
}: {
  banner: Pick<Banner, "sponsored" | "focus">
  copy: Copy
  src: string
}) {
  const { t } = useT()
  return (
    <div className="@container">
      <div className="flex flex-col gap-3 p-3 @xl:flex-row @xl:items-center @xl:gap-0 @xl:p-4">
        <div className="relative aspect-video shrink-0 overflow-hidden rounded-lg bg-muted @xl:order-last @xl:aspect-[2/1] @xl:w-[34%]">
          <img
            src={mediaSrc(src, 960)}
            srcSet={mediaSrcSet(src, 1280)}
            sizes="(min-width: 768px) 40vw, 100vw"
            width={1600}
            height={900}
            alt=""
            loading="lazy"
            decoding="async"
            style={{ objectPosition: `left ${banner.focus}%` }}
            className="absolute inset-0 size-full object-cover rtl:-scale-x-100"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-1 pb-1 @xl:gap-2 @xl:px-8">
          <div className="flex items-center gap-2">
            {banner.sponsored && (
              <Badge variant="signal">{t("nav.ad_badge")}</Badge>
            )}
            <span className="text-caption font-semibold text-primary">
              {copy.eyebrow}
            </span>
          </div>
          <p className="line-clamp-2 text-lead font-semibold text-balance @xl:text-title">
            {copy.heading}
          </p>
          <p className="line-clamp-2 text-body text-muted-foreground">
            {copy.body}
          </p>
          <span
            className={cn(
              buttonVariants(),
              "mt-1 w-fit group-hover:bg-primary/90"
            )}
          >
            {copy.cta}
            <ArrowRightIcon aria-hidden className="size-4 rtl:-scale-x-100" />
          </span>
        </div>
      </div>
    </div>
  )
}
