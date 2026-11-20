import { EmptyState, type EmptyArt } from "@/components/app/empty-state"
import { buttonVariants } from "@/components/ui/button"
import { useT } from "@/lib/i18n/use-t"
import { localeHref } from "@/lib/navigation"

// A home section with nothing to show yet: drawn icon, sentence and one link that fills it (owner, 2026-11-20). `href` is a path without the locale.
export function HomeEmpty({
  art,
  title,
  body,
  href,
  label,
  level = 3,
}: {
  art: EmptyArt
  title: string
  body: string
  href: string
  label: string
  level?: 2 | 3
}) {
  const { locale } = useT()
  return (
    <EmptyState
      icon={art}
      title={title}
      body={body}
      level={level}
      className="rounded-xl bg-muted/40 py-8"
      action={
        <a
          href={localeHref(href, locale)}
          className={buttonVariants({ variant: "outline" })}
        >
          {label}
        </a>
      }
    />
  )
}
