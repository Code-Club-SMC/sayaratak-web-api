import { runSeedPass } from "~/modules/admin-seed/admin-seed.work.service"

import { defineJob } from "./scheduler"

export const adminSeedJob = defineJob({
  name: "admin-seed",
  schedule: "* * * * *",
  run: runSeedPass,
})
