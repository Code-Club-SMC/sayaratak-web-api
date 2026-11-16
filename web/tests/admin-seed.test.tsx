import { fireEvent, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import type { SeedStatus } from "@sayaratak/shared/schemas/admin-seed"

import { SeedSettings } from "@/features/admin-seed/components/seed-settings"
import { resetMockSeedStatus, setMockSeedStatus } from "@/mocks/handlers/admin"
import { renderShell } from "./shell-render"

function makeSeedStatus(overrides?: Partial<SeedStatus>): SeedStatus {
  return {
    capability: {
      enabled: true,
      missing: [],
    },
    catalog: {
      version: "sudan-marketplace-v1",
      manifestDigest: "a".repeat(64),
      listings: 200,
      businesses: 30,
      images: 460,
    },
    dataset: null,
    operation: null,
    assets: {
      accepted: 0,
      missing: 460,
      rejected: 0,
    },
    ...overrides,
  }
}

beforeEach(() => {
  resetMockSeedStatus()
})

describe("SeedSettings", () => {
  it("explains when demo seeding is disabled on the server", async () => {
    setMockSeedStatus(
      makeSeedStatus({
        capability: {
          enabled: false,
          missing: ["ADMIN_SEED_ENABLED", "CLOUDINARY_URL"],
        },
      })
    )

    await renderShell(<SeedSettings />, { role: "admin" })

    expect(
      await screen.findByText("Demo seeding is disabled on this server.")
    ).not.toBeNull()
    expect(
      screen.getByText(
        /Missing requirements: ADMIN_SEED_ENABLED, CLOUDINARY_URL/
      )
    ).not.toBeNull()
  })

  it("shows catalog distribution and prepare button when no dataset exists", async () => {
    setMockSeedStatus(makeSeedStatus())

    await renderShell(<SeedSettings />, { role: "admin" })

    expect(
      await screen.findByText("200 listings, 30 businesses, 460 images")
    ).not.toBeNull()
    expect(
      screen.getByRole("button", { name: "Prepare dataset" })
    ).not.toBeNull()
  })

  it("shows accepted image counts and prompt download when dataset is prepared", async () => {
    setMockSeedStatus(
      makeSeedStatus({
        dataset: {
          id: "sd-test-1",
          version: "sudan-marketplace-v1",
          manifestDigest: "a".repeat(64),
          state: "ready",
          createdAt: "2026-11-16T12:00:00.000Z",
        },
        assets: {
          accepted: 100,
          missing: 358,
          rejected: 2,
        },
      })
    )

    await renderShell(<SeedSettings />, { role: "admin" })

    expect(
      await screen.findByRole("button", { name: "Download prompt pack" })
    ).not.toBeNull()
    expect(screen.getByText("100 / 460 accepted")).not.toBeNull()
    expect(screen.getByText("2 rejected")).not.toBeNull()
  })

  it("shows active operation progress and stage", async () => {
    setMockSeedStatus(
      makeSeedStatus({
        dataset: {
          id: "sd-test-1",
          version: "sudan-marketplace-v1",
          manifestDigest: "a".repeat(64),
          state: "seeding",
          createdAt: "2026-11-16T12:00:00.000Z",
        },
        operation: {
          id: "so-test-1",
          kind: "seed",
          state: "running",
          progress: {
            stage: "insert-listings",
            completed: 115,
            total: 230,
            percent: 50,
          },
          committedImages: 460,
          committedBusinesses: 30,
          committedListings: 85,
          retainedRecords: 0,
          error: null,
          createdAt: "2026-11-16T12:00:00.000Z",
          updatedAt: "2026-11-16T12:01:00.000Z",
        },
        assets: {
          accepted: 460,
          missing: 0,
          rejected: 0,
        },
      })
    )

    await renderShell(<SeedSettings />, { role: "admin" })

    expect(await screen.findByText(/Inserting listings/)).not.toBeNull()
    expect(screen.getByText("50%")).not.toBeNull()
    expect(screen.getByText("115 / 230 completed")).not.toBeNull()
  })

  it("shows retry button on failed operation", async () => {
    setMockSeedStatus(
      makeSeedStatus({
        dataset: {
          id: "sd-test-1",
          version: "sudan-marketplace-v1",
          manifestDigest: "a".repeat(64),
          state: "ready",
          createdAt: "2026-11-16T12:00:00.000Z",
        },
        operation: {
          id: "so-test-1",
          kind: "seed",
          state: "failed",
          progress: {
            stage: "store-images",
            completed: 50,
            total: 230,
            percent: 21,
          },
          committedImages: 50,
          committedBusinesses: 0,
          committedListings: 0,
          retainedRecords: 0,
          error: "seed_media_cleanup_failed",
          createdAt: "2026-11-16T12:00:00.000Z",
          updatedAt: "2026-11-16T12:01:00.000Z",
        },
        assets: {
          accepted: 460,
          missing: 0,
          rejected: 0,
        },
      })
    )

    await renderShell(<SeedSettings />, { role: "admin" })

    expect(await screen.findByText("Media cleanup failed")).not.toBeNull()
    expect(screen.getByRole("button", { name: "Retry" })).not.toBeNull()
  })

  it("opens confirmation dialog before seeding demo data", async () => {
    setMockSeedStatus(
      makeSeedStatus({
        dataset: {
          id: "sd-test-1",
          version: "sudan-marketplace-v1",
          manifestDigest: "a".repeat(64),
          state: "ready",
          createdAt: "2026-11-16T12:00:00.000Z",
        },
        assets: {
          accepted: 460,
          missing: 0,
          rejected: 0,
        },
      })
    )

    await renderShell(<SeedSettings />, { role: "admin" })

    const seedBtn = await screen.findByRole("button", {
      name: "Seed demo data",
    })
    fireEvent.click(seedBtn)

    expect(await screen.findByText("Publish demo data?")).not.toBeNull()
    expect(
      screen.getByText(
        "This will publish 200 listings and 30 businesses to the public marketplace with demo contact information."
      )
    ).not.toBeNull()
  })

  it("opens confirmation dialog before removing demo data", async () => {
    setMockSeedStatus(
      makeSeedStatus({
        dataset: {
          id: "sd-test-1",
          version: "sudan-marketplace-v1",
          manifestDigest: "a".repeat(64),
          state: "ready",
          createdAt: "2026-11-16T12:00:00.000Z",
        },
        assets: {
          accepted: 460,
          missing: 0,
          rejected: 0,
        },
      })
    )

    await renderShell(<SeedSettings />, { role: "admin" })

    const removeBtn = await screen.findByRole("button", {
      name: "Remove demo data",
    })
    fireEvent.click(removeBtn)

    expect(await screen.findByText("Remove demo dataset?")).not.toBeNull()
  })
})
