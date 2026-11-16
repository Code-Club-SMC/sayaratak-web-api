import type { BetterAuthOptions } from "better-auth"

import { localeOf } from "~/shared/mail/locale"

import { refuseSyntheticEmail, refuseSyntheticUser } from "./auth.seed.service"

// Verified against installed Better-Auth db/with-hooks.mjs: before hooks run
// before writes and thrown APIErrors abort OAuth/linking/session creation.
export const authDatabaseHooks = {
  user: {
    create: {
      before: async (user, context) => {
        await refuseSyntheticEmail(user.email.toLowerCase())
        return { data: { ...user, locale: localeOf(context?.request) } }
      },
    },
    update: {
      before: async (user) => {
        if (user.id) await refuseSyntheticUser(user.id)
        if (user.email) await refuseSyntheticEmail(user.email.toLowerCase())
      },
    },
    delete: {
      before: async (user) => {
        await refuseSyntheticUser(user.id)
      },
    },
  },
  session: {
    create: {
      before: async (session) => {
        await refuseSyntheticUser(session.userId)
      },
    },
  },
  account: {
    create: {
      before: async (account) => {
        await refuseSyntheticUser(account.userId)
      },
    },
  },
} satisfies NonNullable<BetterAuthOptions["databaseHooks"]>
