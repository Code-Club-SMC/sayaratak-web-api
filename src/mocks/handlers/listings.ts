import { taxonomySchema } from "@/schemas/taxonomy"

import { db } from "../db"
import { route } from "../http"

route("GET", "/taxonomy", () => taxonomySchema.parse(db.taxonomy))
