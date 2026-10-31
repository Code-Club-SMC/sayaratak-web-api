import { notificationPrefsSchema } from "@sayaratak/shared/schemas/api"
import {
  emailSchema,
  nameSchema,
  passwordSchema,
} from "@sayaratak/shared/schemas/fields"
import { hashPassword } from "better-auth/crypto"
import { eq } from "drizzle-orm"
import { z } from "zod"

import { auditLog } from "~/modules/audit/audit.tables"
import { account, user } from "~/modules/auth/auth.tables"
import { type Executor, transaction } from "~/shared/db/tx"
import { newId } from "~/shared/text/ids"
import { clock } from "~/shared/time/clock"

export const adminInputSchema = z.object({
  email: emailSchema.transform((email) => email.toLowerCase()),
  name: nameSchema,
  password: passwordSchema,
})
type AdminInput = z.input<typeof adminInputSchema>

// An admin gets every notification kind.
const ALL_PREFS = notificationPrefsSchema.parse(
  Object.fromEntries(
    notificationPrefsSchema.keyof().options.map((k) => [k, true])
  )
)

/**
 * Creates a verified admin with a password and two-factor on (the email code step, A6), and one
 * audit row. Throws when the input breaks the shared rules or the email is taken.
 */
export async function createAdmin(ex: Executor, input: AdminInput) {
  const { email, name, password } = adminInputSchema.parse(input)
  const [taken] = await ex
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
  if (taken) throw new Error(`an account with ${email} exists`)
  const now = clock.now()
  const id = newId("u")
  await ex.insert(user).values({
    id,
    name,
    email,
    emailVerified: true,
    twoFactorEnabled: true,
    role: "admin",
    onboardingDone: true,
    prefs: ALL_PREFS,
    createdAt: now,
    updatedAt: now,
  })
  await ex.insert(account).values({
    id: newId("acc"),
    accountId: id,
    providerId: "credential",
    userId: id,
    password: await hashPassword(password),
    createdAt: now,
    updatedAt: now,
  })
  // No acting admin: the account comes from the server terminal.
  await ex.insert(auditLog).values({
    id: newId("au"),
    adminId: null,
    action: "admin.create",
    targetType: "user",
    targetId: id,
    after: { email, name, role: "admin" },
    reason: "create-admin CLI",
    createdAt: now,
  })
  return id
}

// Echo off while the password is typed. `stty` needs the terminal on stdin; when stdin is not a
// terminal (a pipe) there is nothing to hide and the call does nothing.
function askHidden(question: string) {
  Bun.spawnSync(["stty", "-echo"], { stdin: "inherit" })
  try {
    return prompt(question) ?? ""
  } finally {
    Bun.spawnSync(["stty", "echo"], { stdin: "inherit" })
    process.stdout.write("\n")
  }
}

if (import.meta.main) {
  const email = process.argv[2]
  if (!email) {
    process.stderr.write("usage: bun run create-admin <email>\n")
    process.exit(1)
  }
  const name = prompt("Name:") ?? ""
  const password = askHidden("Password:")
  if (askHidden("Password again:") !== password) {
    process.stderr.write("The passwords do not match\n")
    process.exit(1)
  }
  const parsed = adminInputSchema.safeParse({ email, name, password })
  if (!parsed.success) {
    // Shared schemas carry i18n keys as messages; the keys read well enough in a terminal.
    for (const issue of parsed.error.issues)
      process.stderr.write(`${issue.path.join(".")}: ${issue.message}\n`)
    process.exit(1)
  }
  const id = await transaction((tx) => createAdmin(tx, parsed.data))
  process.stdout.write(`Admin ${id} created for ${parsed.data.email}\n`)
  process.exit(0)
}
