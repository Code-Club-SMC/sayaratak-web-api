import { createFileRoute, redirect } from "@tanstack/react-router"

// Dealer Analytics became the Performance tab of Reports (step 11.7-r5); old links keep their period.
export const Route = createFileRoute("/$locale/dealer/analytics")({
  beforeLoad: ({ params, location }) => {
    throw redirect({
      href: `/${params.locale}/dealer/reports${location.searchStr}`,
      replace: true,
    })
  },
})
