import { useT } from "@/lib/i18n/use-t"

// Shown when the home_top slot has no banner: the hero's full-bleed navy frame
// with the brand line, so the search card still overlaps its lower edge and
// real ad banners drop into the same place later. The headline is an h2
// because the page's h1 belongs to the search card.
export function HeroFallback() {
  const { t } = useT()
  return (
    <section className="mx-[calc(50%-50vw)] flex min-h-[20rem] items-center bg-deep text-deep-foreground md:min-h-[24rem]">
      <div className="w-full px-4 pt-10 pb-20 md:px-10 md:pb-24 lg:px-16">
        <div className="flex max-w-xl flex-col gap-3 md:gap-4">
          <h2 className="text-display font-semibold tracking-tight">
            {t("home.hero_title")}
          </h2>
          <p className="text-body text-deep-foreground/85 md:text-lead">
            {t("home.hero_tagline")}
          </p>
        </div>
      </div>
    </section>
  )
}
