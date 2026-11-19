import { createFileRoute, redirect } from "@tanstack/react-router"

// Analytics became the Performance tab of Reports (step 11.7-r8); old links keep their period.
export const Route = createFileRoute("/$locale/workshop/analytics")({
  beforeLoad: ({ params, location }) => {
    throw redirect({
      href: `/${params.locale}/workshop/reports${location.searchStr}`,
      replace: true,
    })
  },
})
