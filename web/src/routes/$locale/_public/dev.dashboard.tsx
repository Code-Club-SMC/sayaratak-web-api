import { useMemo, useState } from "react"
import {
  createFileRoute,
  notFound,
  useNavigate,
  useRouter,
} from "@tanstack/react-router"
import type { RowSelectionState } from "@tanstack/react-table"
import { z } from "zod"

import { rangeSchema } from "@/schemas/api"
import { formatDate } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import type { DataColumn } from "@/lib/table"
import { AreaChartCard } from "@/components/app/area-chart-card"
import { BarChartCard } from "@/components/app/bar-chart-card"
import { ConfirmDialog } from "@/components/app/confirm-dialog"
import { CopyButton } from "@/components/app/copy-button"
import { DataTable } from "@/components/app/data-table"
import { DateRangeSelect } from "@/components/app/date-range-select"
import { EmptyState } from "@/components/app/empty-state"
import { NotFound } from "@/components/app/not-found"
import { PageHeader } from "@/components/app/page-header"
import { PriceText } from "@/components/app/price-text"
import { RowActions } from "@/components/app/row-actions"
import { SettingsSection } from "@/components/app/settings-section"
import { StatCard } from "@/components/app/stat-card"
import { StatusBadge } from "@/components/app/status-badge"
import { Button } from "@/components/ui/button"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

// Development-only demo for step 4.6, so the strings are plain English. Production returns 404. Remove in step 4.7.
const searchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  sort: z.string().optional().catch(undefined),
  q: z.string().optional().catch(undefined),
  status: z
    .enum(["available", "reserved", "sold", "pending"])
    .optional()
    .catch(undefined),
  range: rangeSchema,
})

export const Route = createFileRoute("/$locale/_public/dev/dashboard")({
  validateSearch: searchSchema,
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound()
  },
  notFoundComponent: NotFound,
  component: DashboardDemo,
})

type Row = {
  id: string
  title: string
  price: number
  status: "available" | "reserved" | "sold" | "pending"
  views: number
  posted: string
}
const statuses = ["available", "reserved", "sold", "pending"] as const
const rows: Row[] = Array.from({ length: 200 }, (_, i) => ({
  id: `L-${1000 + i}`,
  title: `Toyota ${["Corolla", "Hilux", "Land Cruiser", "Hiace"][i % 4]} ${2005 + (i % 18)}`,
  price: 4_000_000 + ((i * 7919) % 90) * 500_000,
  status: statuses[(i * 5) % 4]!,
  views: (i * 37) % 900,
  posted: new Date(Date.UTC(2026, 8, 1 + (i % 28))).toISOString(),
}))
const PAGE_SIZE = 10

const series = (days: number) =>
  Array.from({ length: days }, (_, i) => ({
    day: new Date(Date.UTC(2026, 8, 1 + i)).toISOString(),
    views: 80 + ((i * 53) % 70),
    phone: 10 + ((i * 17) % 20),
    whatsapp: 8 + ((i * 29) % 25),
  }))

function DashboardDemo() {
  const params = Route.useSearch()
  const navigate = useNavigate()
  const router = useRouter()
  const { t, locale } = useT()
  const go = (next: Partial<typeof params>) =>
    void navigate({ to: ".", search: { ...params, page: 1, ...next } })
  const [selection, setSelection] = useState<RowSelectionState>({})
  const [removed, setRemoved] = useState<string[]>([])
  const [sold, setSold] = useState<string[]>([])
  const [confirm, setConfirm] = useState(false)
  const [sim, setSim] = useState<"none" | "loading" | "error">("none")

  const filtered = useMemo(() => {
    const q = params.q?.toLowerCase()
    const out = rows
      .filter((r) => !removed.includes(r.id))
      .map((r) => (sold.includes(r.id) ? { ...r, status: "sold" as const } : r))
      .filter(
        (r) =>
          (!params.status || r.status === params.status) &&
          (!q ||
            r.title.toLowerCase().includes(q) ||
            r.id.toLowerCase().includes(q))
      )
    if (params.sort) {
      const i = params.sort.lastIndexOf("_")
      const key = params.sort.slice(0, i) as "price" | "views" | "posted"
      const dir = params.sort.slice(i + 1) === "desc" ? -1 : 1
      out.sort((a, b) => (a[key] < b[key] ? -dir : a[key] > b[key] ? dir : 0))
    }
    return out
  }, [params.q, params.status, params.sort, removed, sold])
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE)
  const pageRows = filtered.slice(
    (params.page - 1) * PAGE_SIZE,
    params.page * PAGE_SIZE
  )
  const ids = Object.keys(selection).filter((k) => selection[k])
  const days = { "7d": 7, "30d": 30, "90d": 90 }[params.range]
  const chart = useMemo(() => series(days), [days])

  const columns: DataColumn<Row>[] = [
    {
      accessorKey: "title",
      header: "Title",
      enableHiding: false,
      cell: (c) => <bdi>{c.row.original.title}</bdi>,
    },
    {
      accessorKey: "id",
      header: "ID",
      cell: (c) => (
        <span className="flex items-center gap-1">
          <bdi dir="ltr">{c.row.original.id}</bdi>
          <CopyButton
            value={c.row.original.id}
            label={`Copy ${c.row.original.id}`}
          />
        </span>
      ),
    },
    {
      accessorKey: "price",
      header: "Price",
      meta: { sortKey: "price" },
      cell: (c) => <PriceText price={c.row.original.price} />,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: (c) => <StatusBadge status={c.row.original.status} />,
    },
    {
      accessorKey: "views",
      header: "Views",
      meta: { sortKey: "views" },
      cell: (c) => <span className="num">{c.row.original.views}</span>,
    },
    {
      accessorKey: "posted",
      header: "Posted",
      meta: { sortKey: "posted" },
      cell: (c) => formatDate(c.row.original.posted, locale),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      enableHiding: false,
      cell: (c) => (
        <RowActions
          label={c.row.original.title}
          actions={[
            {
              key: "sold",
              label: "Mark sold",
              onSelect: () => setSold((s) => [...s, c.row.original.id]),
            },
            {
              key: "delete",
              label: "Delete",
              onSelect: () => setRemoved((r) => [...r, c.row.original.id]),
              destructive: {
                title: "Delete this listing?",
                description: "This cannot be undone.",
              },
            },
          ]}
        />
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6 py-8">
      <PageHeader
        title="Dashboard demo"
        count={String(filtered.length)}
        hint="Table, charts and cards for step 4.6"
      >
        <DateRangeSelect
          value={params.range}
          onChange={(range) => go({ range })}
        />
      </PageHeader>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Simulate state"
      >
        {(["none", "loading", "error"] as const).map((s) => (
          <Button
            key={s}
            type="button"
            variant={sim === s ? "default" : "outline"}
            onClick={() => setSim(s)}
          >
            {s}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Views"
          value={chart.reduce((a, d) => a + d.views, 0)}
          previous={1200}
          loading={sim === "loading"}
        />
        <StatCard
          label="Calls"
          value={chart.reduce((a, d) => a + d.phone, 0)}
          previous={900}
          loading={sim === "loading"}
        />
        <StatCard
          label="WhatsApp"
          value={chart.reduce((a, d) => a + d.whatsapp, 0)}
          previous={0}
          loading={sim === "loading"}
        />
        <StatCard
          label="Messages"
          value={42}
          previous={50}
          loading={sim === "loading"}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <AreaChartCard
          title="Views"
          data={chart}
          series={[{ key: "views", label: "Views" }]}
          loading={sim === "loading"}
          error={sim === "error"}
          onRetry={() => setSim("none")}
        />
        <BarChartCard
          title="Contacts"
          data={chart}
          series={[
            { key: "phone", label: "Calls" },
            { key: "whatsapp", label: "WhatsApp" },
          ]}
          loading={sim === "loading"}
          error={sim === "error"}
          onRetry={() => setSim("none")}
        />
      </div>
      <DataTable
        columns={columns}
        data={pageRows}
        getRowId={(r) => r.id}
        label="Listings"
        loading={sim === "loading"}
        error={sim === "error"}
        onRetry={() => setSim("none")}
        sort={params.sort}
        onSortChange={(sort) => go({ sort })}
        search={params.q}
        onSearch={(q) => go({ q: q || undefined })}
        filters={
          <NativeSelect
            aria-label="Status"
            value={params.status ?? ""}
            onChange={(e) =>
              go({
                status: searchSchema.shape.status.parse(
                  e.target.value || undefined
                ),
              })
            }
          >
            <NativeSelectOption value="">All statuses</NativeSelectOption>
            {statuses.map((s) => (
              <NativeSelectOption key={s} value={s}>
                {t(`status.${s}`)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        }
        selection={{
          value: selection,
          onChange: setSelection,
          actions: (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSold((s) => [...s, ...ids])
                  setSelection({})
                }}
              >
                Mark sold
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setConfirm(true)}
              >
                Delete
              </Button>
            </>
          ),
        }}
        mobileCard={(r) => (
          <div className="flex flex-col gap-1 rounded-lg bg-muted p-3">
            <bdi className="text-ui font-medium">{r.title}</bdi>
            <PriceText price={r.price} />
            <StatusBadge status={r.status} />
          </div>
        )}
        empty={
          <EmptyState
            title="No listings match"
            body="Clear the search or the status filter."
            action={
              <Button
                type="button"
                onClick={() => go({ q: undefined, status: undefined })}
              >
                Clear filters
              </Button>
            }
          />
        }
        page={params.page}
        pageCount={pageCount}
        hrefFor={(page) =>
          router.buildLocation({ to: ".", search: { ...params, page } }).href
        }
        onPageChange={(page) =>
          void navigate({ to: ".", search: { ...params, page } })
        }
      />
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Delete ${ids.length} listings?`}
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          setRemoved((r) => [...r, ...ids])
          setSelection({})
          setConfirm(false)
        }}
      />
      <SettingsSection
        title="Settings section"
        description="Separated by a divider, title beside the body from lg."
      >
        <p className="text-body">Section body.</p>
      </SettingsSection>
    </div>
  )
}
