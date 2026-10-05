import { CheckIcon, CircleIcon } from "lucide-react"

import { useT } from "@/lib/i18n/use-t"
import { passwordSchema } from "@/schemas/fields"

// Each rule is a message of `passwordSchema`, so the hint and the validation cannot disagree.
const rules = [
  ["validation.password_min", "auth.password_rule_length"],
  ["validation.password_letter", "auth.password_rule_letter"],
  ["validation.password_digit", "auth.password_rule_digit"],
] as const

export function PasswordHint({ value, id }: { value: string; id?: string }) {
  const { t } = useT()
  const failing = new Set(
    passwordSchema.safeParse(value).error?.issues.map((i) => i.message)
  )
  return (
    <ul
      id={id}
      aria-label={t("auth.password_rules")}
      aria-live="polite"
      className="flex flex-col gap-1 text-caption"
    >
      {rules.map(([rule, label]) => {
        const met = !failing.has(rule)
        return (
          <li
            key={rule}
            className={`flex items-center gap-1.5 ${met ? "text-success" : "text-muted-foreground"}`}
          >
            {met ? (
              <CheckIcon aria-hidden="true" className="size-3.5" />
            ) : (
              <CircleIcon aria-hidden="true" className="size-3.5" />
            )}
            {t(label)}
            <span className="sr-only">
              {t(met ? "auth.password_rule_met" : "auth.password_rule_unmet")}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
