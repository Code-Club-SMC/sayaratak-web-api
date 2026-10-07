import { createFileRoute, notFound } from "@tanstack/react-router"

import { toast } from "@/components/ui/toast"
import { taxonomyQuery } from "@/features/listings/queries"
import { ListingWizard } from "@/features/listings/wizard/listing-wizard"
import { wizardSearchSchema } from "@/features/listings/wizard/wizard-config"
import { wizardDefaults } from "@/features/listings/wizard/wizard-defaults"
import { wizardSteps } from "@/features/listings/wizard/wizard-steps"

// Development-only home of the post wizard while its steps are built (7.2 to 7.5). Production returns 404. Step 7.6 replaces it with the real `/post` route, which needs a working Publish.
export const Route = createFileRoute("/$locale/dev/post")({
  validateSearch: wizardSearchSchema,
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound()
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(taxonomyQuery),
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: function DevPost() {
    const { step, edit } = Route.useSearch()
    return (
      <ListingWizard
        context="public"
        stepId={step}
        steps={wizardSteps}
        editId={edit}
        defaultValues={wizardDefaults}
        onPublish={() => {
          toast.add({ title: "Development preview: nothing is published" })
          return Promise.resolve()
        }}
      />
    )
  },
})
