import { createFileRoute } from "@tanstack/react-router"

import { dashboardPage } from "@/features/dashboard/overview-route"
import { taxonomyQuery } from "@/features/listings/queries"
import { wizardSearchSchema } from "@/features/listings/wizard/wizard-config"
import { WizardPage } from "@/features/listings/wizard/wizard-page"

const page = dashboardPage("/dealer/inventory/new", "post.new_listing")

export const Route = createFileRoute("/$locale/dealer/inventory/new")({
  validateSearch: wizardSearchSchema,
  ...page,
  loader: async (args) => {
    const [data] = await Promise.all([
      page.loader(args),
      args.context.queryClient.ensureQueryData(taxonomyQuery),
    ])
    return data
  },
  component: function NewVehicle() {
    const { step, listing } = Route.useSearch()
    const navigate = Route.useNavigate()
    return (
      <WizardPage
        context="dealer"
        step={step}
        savedId={listing}
        onSaved={(id) =>
          void navigate({ search: { step: "done", listing: id } })
        }
      />
    )
  },
})
