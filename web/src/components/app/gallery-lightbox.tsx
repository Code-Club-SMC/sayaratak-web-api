import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react"

import { useT } from "@/lib/i18n/use-t"
import { arrowStep } from "@/lib/media"
import { clamp } from "@/lib/utils"
import type { Media } from "@/schemas/listing"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useDirection } from "@/components/ui/direction"
import { GallerySlide } from "./gallery-slide"

export function GalleryLightbox({
  items,
  alt,
  index,
  onIndex,
  onClose,
}: {
  items: Media[]
  alt: string
  index: number
  onIndex: (index: number) => void
  onClose: () => void
}) {
  const { t } = useT()
  const dir = useDirection()
  const last = items.length - 1
  const go = (to: number) => onIndex(clamp(to, 0, last))
  const item = items[index]
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        onKeyDown={(e) => go(index + arrowStep(e.key, dir))}
        className="start-0 top-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 content-center rounded-none bg-foreground p-0 text-background sm:max-w-none rtl:translate-x-0"
      >
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        {item && (
          <GallerySlide
            key={item.id}
            media={item}
            alt={alt}
            sizes="100vw"
            fit="contain"
            className="aspect-auto h-[80dvh] w-full bg-transparent"
          />
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("common.close")}
          onClick={onClose}
          className="absolute end-2 top-2 text-background hover:bg-background/10 hover:text-background"
        >
          <XIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("common.previous")}
          disabled={index === 0}
          onClick={() => go(index - 1)}
          className="absolute start-2 top-1/2 text-background hover:bg-background/10 hover:text-background"
        >
          <ChevronLeftIcon className="rtl:-scale-x-100" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("common.next")}
          disabled={index === last}
          onClick={() => go(index + 1)}
          className="absolute end-2 top-1/2 text-background hover:bg-background/10 hover:text-background"
        >
          <ChevronRightIcon className="rtl:-scale-x-100" />
        </Button>
        <p
          className="absolute inset-x-0 bottom-4 text-center text-ui"
          aria-live="polite"
        >
          {t("common.count_of", { current: index + 1, max: items.length })}
        </p>
      </DialogContent>
    </Dialog>
  )
}
