import type { User } from "@/schemas/user"

// Phone, then email, each on its own line and kept left to right.
export function UserContact({ user }: { user: User }) {
  return (
    <span className="flex min-w-0 flex-col">
      {user.phone && (
        <bdi dir="ltr" className="truncate">
          {user.phone}
        </bdi>
      )}
      {user.email && (
        <bdi dir="ltr" className="truncate text-caption text-muted-foreground">
          {user.email}
        </bdi>
      )}
    </span>
  )
}
