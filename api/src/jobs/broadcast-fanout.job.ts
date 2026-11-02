import { fanOut } from "~/modules/notifications/notifications.fanout.service"

import { defineJob } from "./scheduler"

export const broadcastFanoutJob = defineJob({
  name: "broadcast-fanout",
  schedule: "* * * * *",
  run: () => fanOut(),
})
