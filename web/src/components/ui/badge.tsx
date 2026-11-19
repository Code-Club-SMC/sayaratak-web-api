import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// Status tint: 8 percent of the status color as fill (12 failed 4.5:1 on the page background, step 11.7-r15), the solid color as text (A5). `signal` is solid and means "paid".
const badgeVariants = cva(
  "group/badge inline-flex h-[22px] w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full px-2 text-[length:var(--text-caption)] font-medium whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        muted: "bg-muted text-muted-foreground",
        primary: "bg-primary/8 text-primary",
        success: "bg-success/8 text-success",
        warning: "bg-warning/8 text-warning",
        destructive: "bg-destructive/8 text-destructive",
        signal: "bg-signal text-signal-foreground",
      },
    },
    defaultVariants: {
      variant: "muted",
    },
  }
)

function Badge({
  className,
  variant = "muted",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
