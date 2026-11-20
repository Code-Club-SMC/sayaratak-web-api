import { MediaImage } from "@/components/app/media-image"
import { initials } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import type { AdminBusiness } from "@sayaratak/shared/schemas/admin"

// Logo or photo and the business name as one button that opens its sheet.
export function BusinessCell({
  business,
  onOpen,
}: {
  business: AdminBusiness
  onOpen: () => void
}) {
  const { locale } = useT()
  return (
    <button
      type="button"
      onClick={onOpen}
      // The phone under the name is for the eye; the button's name stays the business name.
      aria-label={business.name[locale]}
      className="flex min-h-11 max-w-72 min-w-0 items-center gap-3 rounded-lg text-start motion-color hover:text-primary"
    >
      {/* No logo, or a logo file that fails: initials, like the console's person rows, not a broken picture. */}
      <MediaImage
        src={business.imageUrl || null}
        alt=""
        sizes="48px"
        className="size-9 shrink-0 rounded-full"
        fallback={
          <span
            aria-hidden="true"
            className="text-caption font-semibold text-muted-foreground"
          >
            {initials(business.name.en)}
          </span>
        }
      />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-ui font-medium">
          <bdi>{business.name[locale]}</bdi>
        </span>
        <span
          dir="ltr"
          className="truncate text-start font-mono text-caption text-muted-foreground"
        >
          {business.phone}
        </span>
      </span>
    </button>
  )
}
