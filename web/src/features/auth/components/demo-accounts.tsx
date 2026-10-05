import { errorText } from "@/lib/api/error-text"
import { useT } from "@/lib/i18n/use-t"
import { Button } from "@/components/ui/button"
import { useLogin } from "../queries"

// Seed accounts, all with the demo password. Shown only when VITE_DEMO is "true".
const accounts = [
  { label: "auth.demo_user", identifier: "+249912345601" },
  { label: "auth.demo_dealer", identifier: "dealer@demo.sy" },
  { label: "auth.demo_workshop", identifier: "workshop@demo.sy" },
  { label: "auth.demo_mechanic", identifier: "mechanic@demo.sy" },
  { label: "auth.demo_admin", identifier: "admin@demo.sy" },
] as const

export function DemoAccounts({ onDone }: { onDone: () => void }) {
  const { t } = useT()
  const login = useLogin()
  if (import.meta.env.VITE_DEMO !== "true") return null
  return (
    <div className="flex flex-col gap-2">
      {accounts.map(({ label, identifier }) => (
        <Button
          key={identifier}
          type="button"
          variant="ghost"
          disabled={login.isPending}
          onClick={() =>
            login.mutate(
              { identifier, password: "Demo1234" },
              { onSuccess: onDone }
            )
          }
        >
          {t(label)}
        </Button>
      ))}
      {login.isError && (
        <p role="alert" className="text-ui text-destructive">
          {errorText(t, login.error)}
        </p>
      )}
    </div>
  )
}
