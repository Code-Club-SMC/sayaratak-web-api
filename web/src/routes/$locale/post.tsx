import { useMemo } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"

import { listingQueries, taxonomyQuery } from "@/features/listings/queries"
import { DoneStep } from "@/features/listings/wizard/done-step"
import { ListingWizard } from "@/features/listings/wizard/listing-wizard"
import { listingToValues } from "@/features/listings/wizard/to-listing-input"
import { useListingLimit } from "@/features/listings/wizard/use-listing-limit"
import { usePublishListing } from "@/features/listings/wizard/use-publish-listing"
import { wizardSearchSchema } from "@/features/listings/wizard/wizard-config"
import { wizardDefaults } from "@/features/listings/wizard/wizard-defaults"
import { wizardSteps } from "@/features/listings/wizard/wizard-steps"
import { getCopy } from "@/lib/i18n/server"
import { buildHead } from "@/lib/seo"

// Open to everyone: a visitor fills the wizard signed out and signs in at Publish. `edit` loads one of the owner's listings into it.
export const Route = createFileRoute("/$locale/post")({
  validateSearch: wizardSearchSchema,
  loader: async ({ context }) => {
    const [[title = ""]] = await Promise.all([
      getCopy({ data: { locale: context.locale, keys: ["listing.post"] } }),
      context.queryClient.ensureQueryData(taxonomyQuery),
    ])
    return { title, locale: context.locale }
  },
  head: ({ loaderData }) =>
    loaderData
      ? buildHead({ ...loaderData, path: "/post", noindex: true })
      : {},
  component: function Post() {
    const { step, edit, listing: savedId } = Route.useSearch()
    const { locale } = Route.useRouteContext()
    const navigate = Route.useNavigate()
    const listing = useQuery({
      ...listingQueries.detail(edit ?? ""),
      enabled: !!edit,
    })
    if (listing.error) throw listing.error
    const base = useMemo(
      () =>
        listing.data && {
          values: listingToValues(listing.data, locale),
          updatedAt: listing.data.updatedAt,
        },
      [listing.data, locale]
    )
    const publish = usePublishListing({
      editId: edit,
      onSaved: (saved) =>
        void navigate({ search: { step: "done", listing: saved.id } }),
    })
    const { reached } = useListingLimit(!!edit)
    // `done` is not a wizard step: it shows the listing that was just saved, and nothing without one.
    if (step === "done")
      return <DoneStep context="public" listingId={savedId} />
    return (
      <ListingWizard
        context="public"
        stepId={step}
        steps={wizardSteps}
        editId={edit}
        base={base}
        defaultValues={wizardDefaults}
        publishDisabled={reached}
        onPublish={publish}
      />
    )
  },
})
