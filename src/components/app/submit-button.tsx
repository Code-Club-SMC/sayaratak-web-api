import type { ComponentProps } from "react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function SubmitButton({
  pending,
  disabled,
  children,
  ...props
}: ComponentProps<typeof Button> & { pending?: boolean }) {
  return (
    <Button
      type="submit"
      {...props}
      disabled={pending || disabled}
      aria-busy={pending}
    >
      {pending && (
        <Spinner
          role="presentation"
          aria-hidden="true"
          aria-label={undefined}
        />
      )}
      {children}
    </Button>
  )
}
