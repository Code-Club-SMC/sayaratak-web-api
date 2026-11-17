import { useT } from "@/lib/i18n/use-t"

// Shown when the home_top slot has no banner: a brand panel in the carousel's
// frame, so real ad banners drop into the same place later. The headline is an
// h2 because the page's h1 belongs to the search card.
export function HeroFallback() {
  const { t } = useT()
  return (
    <section className="flex flex-col justify-center gap-2 rounded-xl bg-primary p-6 md:aspect-[5/2] md:gap-4 md:px-16 lg:aspect-[3/1]">
      <h2 className="max-w-xl text-title text-primary-foreground md:text-page lg:text-hero">
        {t("home.hero_title")}
      </h2>
      <p className="max-w-xl text-ui text-primary-foreground/85 md:text-lead">
        {t("home.hero_tagline")}
      </p>
    </section>
  )
}
