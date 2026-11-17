import { useT } from "@/lib/i18n/use-t"

// Shown when the home_top slot has no banner: a full-bleed brand panel with the
// carousel's full-width shape, so the search card still overlaps its lower
// edge and real ad banners drop into the same frame later. The headline is an
// h2 because the page's h1 belongs to the search card.
export function HeroFallback() {
  const { t } = useT()
  return (
    <section className="relative mx-[calc(50%-50vw)] flex aspect-[16/10] items-center overflow-hidden bg-primary sm:aspect-[5/2] lg:aspect-[3/1]">
      <div className="relative mx-auto w-full max-w-[1200px] px-4 md:px-6">
        <div className="max-w-xl space-y-2 pb-6 sm:pb-10 md:space-y-4 md:pb-16">
          <h2 className="text-title text-primary-foreground md:text-page lg:text-hero">
            {t("home.hero_title")}
          </h2>
          <p className="text-ui text-primary-foreground/85 md:text-lead">
            {t("home.hero_tagline")}
          </p>
        </div>
      </div>
    </section>
  )
}
