import { Button } from "@/components/ui/button"
import { useLogin } from "@/features/auth/queries"
import { useT } from "@/lib/i18n/use-t"

// Stub until step 5.1 builds the real flow: signs in as the demo buyer so the gate can replay.
export function AuthFlow({ onDone }: { onDone: () => void }) {
  const { t } = useT()
  const login = useLogin()
  return (
    <Button
      disabled={login.isPending}
      onClick={() =>
        login.mutate(
          { identifier: "+249912345601", password: "Demo1234" },
          { onSuccess: onDone }
        )
      }
    >
      {t("auth.demo_user")}
    </Button>
  )
}
