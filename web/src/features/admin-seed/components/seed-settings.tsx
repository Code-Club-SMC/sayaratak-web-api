import { useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { useT } from "@/lib/i18n/use-t"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { SectionError } from "@/components/app/section-error"
import { SettingsSection } from "@/components/app/settings-section"
import {
  downloadSeedPrompts,
  seedQueries,
  usePrepareSeed,
  useRemoveSeed,
  useStartSeed,
} from "../queries"
import { SeedAssets } from "./seed-assets"
import { SeedConfirmButton, SeedRemoveButton } from "./seed-confirmation"
import { SeedOperationView } from "./seed-operation"

export function SeedSettings() {
  const { t } = useT()
  const { data, isError, isLoading, refetch } = useQuery(seedQueries.status)
  const prepare = usePrepareSeed()
  const start = useStartSeed()
  const remove = useRemoveSeed()
  const [downloading, setDownloading] = useState(false)

  if (isLoading) {
    return <Skeleton className="h-64 rounded-xl" />
  }

  if (isError || !data) {
    return (
      <SectionError
        title={t("admin.seed_settings_title")}
        message={t("admin.seed_settings_error")}
        onRetry={() => void refetch()}
      />
    )
  }

  const { capability, catalog, dataset, operation, assets } = data
  const isOperationActive =
    operation?.state === "receiving" ||
    operation?.state === "queued" ||
    operation?.state === "running"

  const handleDownloadPrompts = async () => {
    try {
      setDownloading(true)
      await downloadSeedPrompts()
    } finally {
      setDownloading(false)
    }
  }

  return (
    <SettingsSection
      title={t("admin.seed_settings_title")}
      description={t("admin.seed_settings_description")}
    >
      <div className="flex flex-col gap-4">
        {!capability.enabled ? (
          <div className="rounded-lg border border-border/80 bg-muted/20 p-4 text-ui text-muted-foreground">
            <p className="font-medium text-foreground">
              {t("admin.seed_capability_disabled")}
            </p>
            {capability.missing.length > 0 && (
              <p className="mt-1 text-caption">
                {t("admin.seed_capability_missing")}:{" "}
                {capability.missing.join(", ")}
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-ui">
              <span className="text-muted-foreground">
                {t("admin.seed_catalog_distribution", {
                  listings: catalog.listings,
                  businesses: catalog.businesses,
                  images: catalog.images,
                })}
              </span>
              {dataset && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={downloading}
                  onClick={handleDownloadPrompts}
                >
                  {downloading
                    ? t("admin.seed_downloading_prompts")
                    : t("admin.seed_action_download_prompts")}
                </Button>
              )}
            </div>

            {!dataset ? (
              <div className="pt-2">
                <Button
                  type="button"
                  disabled={prepare.isPending}
                  onClick={() => prepare.mutate()}
                >
                  {prepare.isPending
                    ? t("admin.seed_preparing")
                    : t("admin.seed_action_prepare")}
                </Button>
              </div>
            ) : (
              <>
                <SeedAssets
                  manifestDigest={dataset.manifestDigest}
                  accepted={assets.accepted}
                  total={catalog.images}
                  rejected={assets.rejected}
                  disabled={isOperationActive}
                />

                {operation && (
                  <SeedOperationView
                    operation={operation}
                    manifestDigest={dataset.manifestDigest}
                  />
                )}

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {assets.accepted === catalog.images &&
                    dataset.state !== "seeding" && (
                      <SeedConfirmButton
                        disabled={isOperationActive}
                        pending={start.isPending}
                        onConfirm={() => start.mutate(dataset.manifestDigest)}
                      />
                    )}

                  {(dataset.state === "ready" ||
                    dataset.state === "retained" ||
                    dataset.state === "seeding") &&
                    !isOperationActive && (
                      <SeedRemoveButton
                        disabled={remove.isPending}
                        onConfirm={() =>
                          remove.mutate({
                            datasetId: dataset.id,
                            manifestDigest: dataset.manifestDigest,
                          })
                        }
                      />
                    )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </SettingsSection>
  )
}
