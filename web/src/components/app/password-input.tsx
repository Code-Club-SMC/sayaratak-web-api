import { useState, type ComponentProps } from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"

import { useT } from "@/lib/i18n/use-t"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function PasswordInput({
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, "type">) {
  const { t } = useT()
  const [shown, setShown] = useState(false)
  return (
    <div className="relative">
      <Input
        {...props}
        type={shown ? "text" : "password"}
        className={`pe-12 ${className ?? ""}`}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute end-0 top-0"
        aria-label={t(shown ? "form.hide_password" : "form.show_password")}
        aria-pressed={shown}
        onClick={() => setShown(!shown)}
      >
        {shown ? <EyeOffIcon /> : <EyeIcon />}
      </Button>
    </div>
  )
}
