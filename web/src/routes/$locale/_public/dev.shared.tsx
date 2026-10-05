import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, notFound } from "@tanstack/react-router"

import { billingQueries } from "@/features/billing/queries"
import { listingQueries } from "@/features/listings/queries"
import { searchParamsSchema } from "@/features/search/schemas"
import { AuthCardLayout } from "@/components/app/auth-card-layout"
import { Breadcrumbs } from "@/components/app/breadcrumbs"
import { DatePicker } from "@/components/app/date-picker"
import { FocusedTopBar } from "@/components/app/focused-top-bar"
import { LimitMeter } from "@/components/app/limit-meter"
import { ListingGrid } from "@/components/app/listing-grid"
import { ListingPickerDialog } from "@/components/app/listing-picker-dialog"
import { ListingPreview } from "@/components/app/listing-preview"
import { ListingRail } from "@/components/app/listing-rail"
import { LocationBlock } from "@/components/app/location-block"
import { NotFound } from "@/components/app/not-found"
import { PasswordHint } from "@/components/app/password-hint"
import { PasswordInput } from "@/components/app/password-input"
import { PhoneList, type PhoneRow } from "@/components/app/phone-list"
import { PlansGrid } from "@/components/app/plans-grid"
import { ProfilePreview } from "@/components/app/profile-preview"
import { PromotionOption } from "@/components/app/promotion-option"
import { StepHeader } from "@/components/app/step-header"
import { StickyFooter } from "@/components/app/sticky-footer"
import { UsageMeter } from "@/components/app/usage-meter"
import { Button } from "@/components/ui/button"
import type { PromotionType } from "@/schemas/listing"

// Development-only demo for step 4.7, so the strings are plain English. Production returns 404. Remove in step 14.6.
export const Route = createFileRoute("/$locale/_public/dev/shared")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound()
  },
  notFoundComponent: NotFound,
  component: SharedDemo,
})

const promos: [PromotionType, number, number][] = [
  ["pin", 7, 15000],
  ["boost", 3, 8000],
  ["homepage", 7, 40000],
  ["sponsored", 30, 90000],
]

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-title font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function SharedDemo() {
  const { data } = useQuery(listingQueries.list(searchParamsSchema.parse({})))
  const plans = useQuery(billingQueries.plans())
  const listings = (data?.items ?? []).slice(0, 8)
  const [phones, setPhones] = useState<PhoneRow[]>([{ value: "" }])
  const [plan, setPlan] = useState<string>()
  const [promo, setPromo] = useState<PromotionType>("pin")
  const [password, setPassword] = useState("")
  const [date, setDate] = useState<Date>()
  const [picked, setPicked] = useState<string>()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [step, setStep] = useState(1)
  return (
    <div className="flex flex-col gap-10 pt-12 pb-32">
      <h1 className="text-page font-semibold">Shared pieces demo</h1>
      <Section title="Breadcrumbs">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Cars", href: "/vehicles/cars/sale" },
            { label: "Toyota Hilux 2019" },
          ]}
        />
      </Section>
      <Section title="ListingRail">
        <ListingRail
          title="Latest cars"
          href="/vehicles/cars/sale"
          listings={listings}
        />
      </Section>
      <Section title="ListingGrid, grid then row">
        <ListingGrid listings={listings.slice(0, 4)} view="grid" />
        <ListingGrid listings={listings.slice(0, 4)} view="row" />
      </Section>
      <Section title="LocationBlock">
        <LocationBlock
          cityId={listings[0]?.cityId ?? ""}
          address="Street 15, near the market"
          location={listings[0]?.location ?? { lat: 15.5, lng: 32.56 }}
        />
      </Section>
      <Section title="PhoneList">
        <PhoneList
          value={phones}
          onChange={setPhones}
          errors={[undefined, "validation.phone"]}
        />
      </Section>
      <Section title="PlansGrid, select then action">
        {plans.data && (
          <>
            <PlansGrid
              mode="select"
              label="Plans"
              plans={plans.data.filter((p) => p.audience === "dealership")}
              value={plan}
              onChange={setPlan}
            />
            <PlansGrid
              mode="action"
              actionLabel="Subscribe"
              plans={plans.data.filter((p) => p.audience === "workshop")}
              currentId={plans.data.find((p) => p.audience === "workshop")?.id}
              onAction={setPlan}
            />
          </>
        )}
      </Section>
      <Section title="UsageMeter and LimitMeter">
        <UsageMeter label="Listings" used={12} limit={20} />
        <UsageMeter label="Listings" used={4} limit={null} />
        <LimitMeter
          label="Listings"
          used={20}
          limit={20}
          action={<Button size="sm">Upgrade</Button>}
        />
      </Section>
      <Section title="PromotionOption">
        <div
          className="flex flex-col gap-2"
          role="radiogroup"
          aria-label="Promotion"
        >
          {promos.map(([type, days, price]) => (
            <PromotionOption
              key={type}
              name="promo"
              type={type}
              durationDays={days}
              price={price}
              selected={promo === type}
              onSelect={() => setPromo(type)}
            />
          ))}
        </div>
      </Section>
      <Section title="PasswordHint">
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby="pw-hint"
          aria-label="Password"
        />
        <PasswordHint id="pw-hint" value={password} />
      </Section>
      <Section title="DatePicker">
        <div className="max-w-xs">
          <DatePicker value={date} onChange={setDate} />
        </div>
      </Section>
      <Section title="ListingPickerDialog (needs a signed-in seller)">
        <Button className="self-start" onClick={() => setPickerOpen(true)}>
          Choose a listing
        </Button>
        <p>Picked: {picked ?? "nothing"}</p>
        <ListingPickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onSelect={setPicked}
          title="Choose a listing"
        />
      </Section>
      <Section title="ProfilePreview">
        <div className="grid gap-4 md:grid-cols-3">
          <ProfilePreview
            variant="dealership"
            name="Al Nile Motors"
            cityId={listings[0]?.cityId}
          />
          <ProfilePreview variant="workshop" name="" />
          <ProfilePreview variant="mechanic" name="Ahmed" />
        </div>
      </Section>
      <Section title="ListingPreview, full then compact">
        {listings[0] && (
          <div className="grid max-w-xs gap-4">
            <ListingPreview listing={listings[0]} />
            <ListingPreview listing={listings[0]} compact />
          </div>
        )}
      </Section>
      <Section title="FocusedTopBar and StepHeader">
        <FocusedTopBar
          action={{ label: "Save and exit", onClick: () => setStep(1) }}
        />
        <StepHeader title={`Step ${step}`} helper="Helper line" step={step} />
      </Section>
      <Section title="AuthCardLayout">
        <div className="max-h-[28rem] overflow-auto bg-muted">
          <AuthCardLayout title="Forgot password" description="We send a code.">
            <Button>Send code</Button>
          </AuthCardLayout>
        </div>
      </Section>
      <StickyFooter
        onBack={() => setStep(Math.max(1, step - 1))}
        skip={
          <Button variant="ghost" onClick={() => setStep(step + 1)}>
            Skip
          </Button>
        }
      >
        <Button onClick={() => setStep(step + 1)}>Next</Button>
      </StickyFooter>
    </div>
  )
}
