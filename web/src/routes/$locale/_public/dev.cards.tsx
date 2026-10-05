import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, notFound } from "@tanstack/react-router"

import { directoryQueries } from "@/features/directory/queries"
import { listingQueries } from "@/features/listings/queries"
import { searchParamsSchema } from "@/features/search/schemas"
import type { Listing } from "@/schemas/listing"
import { DealershipCard } from "@/components/app/dealership-card"
import { ListingCard } from "@/components/app/listing-card"
import { MechanicCard } from "@/components/app/mechanic-card"
import { NotFound } from "@/components/app/not-found"
import { RatingStars } from "@/components/app/rating-stars"
import { RatingSummary } from "@/components/app/rating-summary"
import { WorkshopCard } from "@/components/app/workshop-card"

// Development-only demo for step 4.2, so the strings are plain English. Production returns 404. Remove in step 4.7.
export const Route = createFileRoute("/$locale/_public/dev/cards")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound()
  },
  notFoundComponent: NotFound,
  component: CardsDemo,
})

const longAr =
  "تويوتا هايلكس دبل كابينة موديل ٢٠١٩ ماشية قليلة جدا نظيفة جدا بحالة الوكالة فل كامل بدون حوادث للبيع في الخرطوم بحري"
const longEn =
  "Toyota Hilux double cab 2019 very low mileage immaculate condition full options no accidents Khartoum North"

function CardsDemo() {
  const [rating, setRating] = useState(0)
  const { data } = useQuery(listingQueries.list(searchParamsSchema.parse({})))
  const dealers = useQuery(directoryQueries.dealerships.list())
  const workshops = useQuery(directoryQueries.workshops.list())
  const mechanics = useQuery(directoryQueries.mechanics.list())
  const items: Listing[] = (data?.items ?? [])
    .slice(0, 12)
    .map((l, i) =>
      i === 1 ? { ...l, title: longAr } : i === 2 ? { ...l, title: longEn } : l
    )
  return (
    <div className="flex flex-col gap-8 py-12">
      <h1 className="text-page font-semibold">Cards demo</h1>
      <section className="flex flex-col gap-3">
        <h2 className="text-title font-semibold">ListingCard, grid</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-title font-semibold">ListingCard, row</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((l) => (
            <ListingCard key={l.id} listing={l} variant="row" />
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-title font-semibold">Provider cards</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {dealers.data?.items.slice(0, 3).map((d) => (
            <DealershipCard key={d.id} dealership={d} />
          ))}
          {workshops.data?.items.slice(0, 3).map((w) => (
            <WorkshopCard key={w.id} workshop={w} />
          ))}
          {mechanics.data?.items.slice(0, 3).map((m) => (
            <MechanicCard key={m.id} mechanic={m} />
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-title font-semibold">Rating</h2>
        <RatingStars value={rating} onChange={setRating} label="Your rating" />
        <RatingStars value={4.4} />
        <RatingSummary avg={4.2} count={50} histogram={[2, 3, 5, 15, 25]} />
        <RatingSummary avg={4.2} count={50} />
      </section>
    </div>
  )
}
