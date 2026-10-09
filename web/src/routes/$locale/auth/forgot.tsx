import { createFileRoute } from "@tanstack/react-router"

import { AuthShell } from "@/components/app/auth-shell"
import { ForgotFlow } from "@/features/auth/components/forgot-flow"
import { authPage } from "@/features/auth/auth-page"

export const Route = createFileRoute("/$locale/auth/forgot")({
  ...authPage("/auth/forgot", "auth.forgot_title", "auth.forgot_description"),
  component: () => (
    <AuthShell panel="reset">
      <ForgotFlow />
    </AuthShell>
  ),
})
