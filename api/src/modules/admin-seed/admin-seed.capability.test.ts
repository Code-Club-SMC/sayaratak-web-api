import { expect, test } from "bun:test"

import { env } from "~/env"

import { getSeedCapability } from "./admin-seed.capability.service"

test("hosted development cannot substitute fake storage for missing providers", () => {
  const configuration = {
    ...env,
    ADMIN_SEED_ENABLED: true,
    NODE_ENV: "production",
    APP_ENV: "development",
    CLOUDINARY_URL: undefined,
    R2_ACCOUNT_ID: undefined,
    R2_ACCESS_KEY_ID: undefined,
    R2_SECRET_ACCESS_KEY: undefined,
    R2_BUCKET: undefined,
  } satisfies typeof env
  expect(getSeedCapability(configuration)).toEqual({
    enabled: false,
    missing: [
      "CLOUDINARY_URL",
      "R2_ACCOUNT_ID",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "R2_BUCKET",
    ],
  })
})

test("fake services require both test environment markers", () => {
  expect(
    getSeedCapability({
      ...env,
      ADMIN_SEED_ENABLED: true,
      NODE_ENV: "test",
      APP_ENV: "development",
    })
  ).toEqual({ enabled: false, missing: ["TEST_ENVIRONMENT"] })
  expect(
    getSeedCapability({
      ...env,
      ADMIN_SEED_ENABLED: true,
      NODE_ENV: "test",
      APP_ENV: "test",
    })
  ).toEqual({ enabled: true, missing: [] })
})

test("real configured providers still require the explicit enable flag", () => {
  const configuration = {
    ...env,
    ADMIN_SEED_ENABLED: false,
    NODE_ENV: "production",
    APP_ENV: "development",
    CLOUDINARY_URL: "cloudinary://key:secret@cloud",
    R2_ACCOUNT_ID: "account",
    R2_ACCESS_KEY_ID: "access",
    R2_SECRET_ACCESS_KEY: "secret",
    R2_BUCKET: "bucket",
  } satisfies typeof env
  expect(getSeedCapability(configuration)).toEqual({
    enabled: false,
    missing: ["ADMIN_SEED_ENABLED"],
  })
  expect(
    getSeedCapability({ ...configuration, ADMIN_SEED_ENABLED: true })
  ).toEqual({ enabled: true, missing: [] })
})
