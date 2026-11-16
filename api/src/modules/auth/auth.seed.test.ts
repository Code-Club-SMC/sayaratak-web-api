import { beforeEach, expect, test } from "bun:test"
import { eq } from "drizzle-orm"

import { db } from "~/shared/db/client"
import { flushMail, testInbox } from "~/shared/mail/send"

import { seedPreviewFixture } from "../../../tests/admin-seed"
import { authPost, req, resetDb } from "../../../tests/helpers"
import { auth } from "./auth.config"
import { existingSignUp } from "./auth.guard.service"
import { account, session, user } from "./auth.tables"

beforeEach(resetDb)

test("fictional owners have no usable auth, verification, outgoing preferences or bans", async () => {
  const { datasetId } = await seedPreviewFixture()
  const [owner] = await db
    .select()
    .from(user)
    .where(eq(user.seedDatasetId, datasetId))
  if (!owner) throw new Error("fixture owner missing")
  expect(owner.email).toEndWith(".invalid")
  expect(owner.emailVerified).toBe(false)
  expect(owner.verifiedPhone).toBe(false)
  expect(owner.banned).toBe(false)
  expect(Object.values(owner.prefs).every((enabled) => !enabled)).toBe(true)
  expect(await db.$count(account, eq(account.userId, owner.id))).toBe(0)
  expect(await db.$count(session, eq(session.userId, owner.id))).toBe(0)
  expect(await existingSignUp(owner.email)).toBe("exists")
  for (const path of [
    "/sign-up/email",
    "/sign-in/email",
    "/email-otp/send-verification-otp",
    "/email-otp/request-password-reset",
    "/email-otp/reset-password",
  ])
    expect(
      (
        await authPost(path, {
          email: owner.email,
          name: "Takeover",
          password: "Password123",
          type: "sign-in",
          otp: "123456",
        })
      ).status
    ).toBe(403)
  await flushMail()
  expect(testInbox.some((mail) => mail.to === owner.email)).toBe(false)
  expect(await db.$count(user, eq(user.id, owner.id))).toBe(1)
})

test("installed Better-Auth hooks reject OAuth account linking and session creation", async () => {
  const { datasetId } = await seedPreviewFixture()
  const [owner] = await db
    .select()
    .from(user)
    .where(eq(user.seedDatasetId, datasetId))
  if (!owner) throw new Error("fixture owner missing")
  const context = await auth.$context
  await expect(
    context.internalAdapter.createAccount({
      userId: owner.id,
      accountId: "oauth-takeover",
      providerId: "google",
    })
  ).rejects.toMatchObject({ status: "FORBIDDEN" })
  await expect(
    context.internalAdapter.createSession(owner.id)
  ).rejects.toMatchObject({ status: "FORBIDDEN" })
  expect(await db.$count(account, eq(account.userId, owner.id))).toBe(0)
})

test("even a regression-injected synthetic bearer session cannot load or access token routes", async () => {
  const { datasetId } = await seedPreviewFixture()
  const [owner] = await db
    .select()
    .from(user)
    .where(eq(user.seedDatasetId, datasetId))
  if (!owner) throw new Error("fixture owner missing")
  const now = new Date()
  await db.insert(session).values({
    id: "seed-injected-session",
    token: "seed-injected-token",
    userId: owner.id,
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + 3_600_000),
  })
  const headers = { authorization: "Bearer seed-injected-token" }
  expect((await req("/me", { headers })).status).toBe(403)
  expect((await req("/auth/get-session", { headers })).status).toBe(403)
  expect(
    (
      await req("/auth/get-access-token", {
        method: "POST",
        headers: {
          ...headers,
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({ providerId: "google" }),
      })
    ).status
  ).toBe(403)
})
