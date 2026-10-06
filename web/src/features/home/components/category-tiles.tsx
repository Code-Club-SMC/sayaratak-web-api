import { useQuery } from "@tanstack/react-query"
import {
  BikeIcon,
  CarIcon,
  CarTaxiFrontIcon,
  CogIcon,
  HardHatIcon,
  MotorbikeIcon,
  TruckIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react"

import { taxonomyQuery } from "@/features/listings/queries"
import { typeSlug } from "@/features/search/landing"
import { formatNumber } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import { localeHref } from "@/lib/navigation"
import type { VehicleType } from "@/schemas/listing"
import { homeQueries } from "../queries"

const typeIcon: Record<VehicleType, LucideIcon> = {
  car: CarIcon,
  truck: TruckIcon,
  motorcycle: MotorbikeIcon,
  tuk_tuk: CarTaxiFrontIcon,
  rickshaw: BikeIcon,
}

// Eight tiles: the enabled vehicle types, Parts, Workshops and Mechanics, each with a live count. The vehicle counts are the facets of the "Newly added" rail, so they cost no request of their own.
export function CategoryTiles() {
  const { t, locale } = useT()
  const taxonomy = useQuery(taxonomyQuery).data
  const facets = useQuery({
    ...homeQueries.newest,
    select: (page) => page.facets.type,
  }).data
  const parts = useQuery({ ...homeQueries.parts, select: (p) => p.total }).data
  const workshops = useQuery({
    ...homeQueries.workshops,
    select: (p) => p.total,
  }).data
  const mechanics = useQuery({
    ...homeQueries.mechanics,
    select: (p) => p.total,
  }).data
  const tiles: {
    key: string
    label: string
    path: string
    Icon: LucideIcon
    count: number | undefined
  }[] = [
    ...(taxonomy?.vehicleTypes ?? [])
      .filter((v) => v.enabled)
      .map((v) => ({
        key: v.id,
        label: v.name[locale],
        path: `/vehicles/${typeSlug(v.id)}/sale`,
        Icon: typeIcon[v.id],
        count: facets && (facets.find((f) => f.value === v.id)?.count ?? 0),
      })),
    {
      key: "parts",
      label: t("nav.parts"),
      path: "/parts",
      Icon: CogIcon,
      count: parts,
    },
    {
      key: "workshops",
      label: t("nav.workshops"),
      path: "/workshops",
      Icon: WrenchIcon,
      count: workshops,
    },
    {
      key: "mechanics",
      label: t("nav.mechanics"),
      path: "/mechanics",
      Icon: HardHatIcon,
      count: mechanics,
    },
  ]
  return (
    <section aria-labelledby="home-categories">
      <h2 id="home-categories" className="sr-only">
        {t("home.categories")}
      </h2>
      <ul className="grid grid-cols-4 gap-2 md:gap-4">
        {tiles.map(({ key, label, path, Icon, count }) => (
          <li key={key} className="*:h-full">
            <a
              href={localeHref(path, locale)}
              className="flex h-18 press flex-col justify-between rounded-xl bg-card p-2 hover:bg-muted md:h-24 md:p-4"
            >
              <Icon
                aria-hidden="true"
                strokeWidth={1.5}
                className="size-5 text-primary md:size-6"
              />
              <span className="flex flex-col">
                <span className="text-caption font-semibold break-words hyphens-auto md:text-body">
                  {label}
                </span>
                <span className="hidden min-h-4 text-caption text-muted-foreground num md:block">
                  {count === undefined ? "" : formatNumber(count, locale)}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
