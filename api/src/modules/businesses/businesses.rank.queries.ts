import { eq, or } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { listedWhere } from "./businesses.queries"
import { dealerships, mechanics, workshops } from "./businesses.tables"
import type { BusinessKind } from "./businesses.types"

const tables = {
  dealership: dealerships,
  workshop: workshops,
  mechanic: mechanics,
}

/** Listed businesses of one kind plus the asker's own (listed or not), for the city rank (step 11.7-r8). */
export function listRankPeers(
  ex: Executor,
  find: { kind: BusinessKind; selfId: string; hiddenOwnerIds: string[] }
) {
  const table = tables[find.kind]
  return ex
    .select({
      id: table.id,
      cityId: table.cityId,
      ownerUserId: table.ownerUserId,
    })
    .from(table)
    .where(
      or(listedWhere(table, find.hiddenOwnerIds), eq(table.id, find.selfId))
    )
}
