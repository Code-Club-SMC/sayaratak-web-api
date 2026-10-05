import { useId, type ReactNode } from "react"

import { useT } from "@/lib/i18n/use-t"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { FieldError } from "./field-error"

export type ControlProps = {
  id: string
  "aria-invalid": boolean
  "aria-describedby": string | undefined
}

// Label, control, hint and translated error wired together with ids. The control comes in as a render prop.
export function FormField({
  label,
  error,
  description,
  optional,
  className,
  children,
}: {
  label: string
  error?: string
  description?: string
  optional?: boolean
  className?: string
  children: (control: ControlProps) => ReactNode
}) {
  const { t } = useT()
  const id = useId()
  const describedBy =
    [error && `${id}-error`, description && `${id}-hint`]
      .filter(Boolean)
      .join(" ") || undefined
  return (
    <Field data-invalid={Boolean(error)} className={className}>
      <FieldLabel htmlFor={id}>
        {label}
        {optional && (
          <span className="font-normal text-muted-foreground">
            ({t("form.optional")})
          </span>
        )}
      </FieldLabel>
      {children({
        id,
        "aria-invalid": Boolean(error),
        "aria-describedby": describedBy,
      })}
      {description && (
        <FieldDescription id={`${id}-hint`}>{description}</FieldDescription>
      )}
      <FieldError id={`${id}-error`} message={error} />
    </Field>
  )
}
