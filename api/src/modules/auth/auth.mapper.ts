import type { User } from "@sayaratak/shared/schemas/user"

import type { UserRow } from "./auth.tables"

type Extras = { hasPassword: boolean; avatarUrl: string | undefined }

/** The account as `GET /me` answers it, in `userSchema` order (the mock's `publicUser`). */
export function toUser(row: UserRow, extras: Extras): User {
  return {
    id: row.id,
    role: row.role,
    fullName: row.name,
    email: row.email,
    phone: row.phone ?? undefined,
    avatarUrl: extras.avatarUrl,
    cityId: row.cityId ?? undefined,
    verifiedPhone: row.verifiedPhone,
    verifiedEmail: row.emailVerified,
    hasPassword: extras.hasPassword,
    banned: row.banned,
    bannedReason: row.banReason ?? undefined,
    bannedUntil: row.banExpires?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    onboardingDone: row.onboardingDone,
    interests: row.interests,
    chosenPlanId: row.chosenPlanId ?? undefined,
  }
}
