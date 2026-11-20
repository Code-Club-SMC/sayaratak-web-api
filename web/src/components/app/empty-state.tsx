import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

// The drawn icons in public/icons/empty (owner, 2026-11-20). Painted through a CSS mask so they take the text color in both themes.
export type EmptyArt =
  | "ad-space"
  | "dealerships"
  | "featured"
  | "inventory"
  | "makes"
  | "map"
  | "mechanics"
  | "motorcycles"
  | "near-you"
  | "newest"
  | "parts"
  | "portfolio"
  | "rentals"
  | "reviews"
  | "search"
  | "services"
  | "trucks"
  | "workshops"

// The one empty state of the app, on the shadcn Empty: icon tile, title, optional sentence, optional action, all centered.
// `level` is the heading level of the title and also sets the size: 2 for a page or pane (48px tile, title role), 3 inside a titled panel (40px tile, body-size title). Pass `className` for the height (`h-64`) or a tighter `py-6`.
// `error` paints the tile red and announces the state; pass the retry button as `action`.
// The type roles sit on inner spans, because `cn` reads a role next to a text size as a clash.
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  level = 2,
  wide = false,
  error = false,
  className,
}: {
  icon: LucideIcon | EmptyArt
  title: string
  body?: string
  action?: ReactNode
  level?: 2 | 3
  // Lets the action grow past the 24 rem column (a row of suggestion chips).
  wide?: boolean
  error?: boolean
  className?: string
}) {
  const panel = level === 3
  return (
    <Empty
      role={error ? "alert" : undefined}
      className={cn(panel ? "py-8" : "py-12", className)}
    >
      <EmptyHeader>
        {typeof Icon === "string" ? (
          <EmptyMedia>
            <span
              aria-hidden="true"
              className="size-14 bg-muted-foreground"
              style={{
                mask: `url(/icons/empty/empty-${Icon}.svg) center / contain no-repeat`,
              }}
            />
          </EmptyMedia>
        ) : (
          <EmptyMedia
            variant="icon"
            className={cn(
              panel ? "size-10" : "size-12",
              error && "bg-destructive/10 text-destructive"
            )}
          >
            <Icon
              aria-hidden="true"
              strokeWidth={1.5}
              className={panel ? "size-5" : "size-6"}
            />
          </EmptyMedia>
        )}
        {/* tracking-normal undoes the primitive's tracking-tight: letter spacing breaks Arabic joining (A5). */}
        <EmptyTitle
          role="heading"
          aria-level={level}
          className="tracking-normal"
        >
          <span
            className={
              panel ? "text-body font-semibold" : "text-title font-semibold"
            }
          >
            {title}
          </span>
        </EmptyTitle>
        {body && (
          <EmptyDescription>
            <span className={panel ? "text-ui" : "text-body"}>{body}</span>
          </EmptyDescription>
        )}
      </EmptyHeader>
      {action && (
        <EmptyContent className={wide ? "max-w-none" : undefined}>
          {action}
        </EmptyContent>
      )}
    </Empty>
  )
}
