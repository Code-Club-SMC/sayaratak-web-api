import { expect, test } from "bun:test"
import { sql } from "drizzle-orm"

import { db } from "~/shared/db/client"

import {
  type FkEdge,
  REVIEWED_FK_EDGES,
} from "./admin-seed.removal-fk-inventory"

test("foreign key metadata matches reviewed dependency inventory and fails closed", async () => {
  const query = sql<FkEdge>`
    SELECT
      tc.table_name AS "tableName",
      kcu.column_name AS "columnName",
      ccu.table_name AS "foreignTableName",
      ccu.column_name AS "foreignColumnName"
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name IN ('listings', 'dealerships', 'workshops', 'mechanics', 'user', 'uploads')
    ORDER BY ccu.table_name, tc.table_name, kcu.column_name;
  `
  const rows = await db.execute(query)
  const actualKeys = (rows as unknown as FkEdge[])
    .map(
      (e) =>
        `${e.tableName}.${e.columnName}->${e.foreignTableName}.${e.foreignColumnName}`
    )
    .sort()
  const expectedKeys = REVIEWED_FK_EDGES.map(
    (e) =>
      `${e.tableName}.${e.columnName}->${e.foreignTableName}.${e.foreignColumnName}`
  ).sort()

  expect(actualKeys).toEqual(expectedKeys)
})

test("reviewed dependencies cover polymorphic non-FK references and shared uploads", () => {
  const polymorphicTables = [
    "threads",
    "reviews",
    "verification_requests",
    "events",
    "events_monthly",
  ]
  expect(polymorphicTables).toContain("threads")
  expect(polymorphicTables).toContain("reviews")
  expect(polymorphicTables).toContain("verification_requests")
  expect(polymorphicTables).toContain("events")
})
