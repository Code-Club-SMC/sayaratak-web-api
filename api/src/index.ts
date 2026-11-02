import { app } from "~/app"
import { env } from "~/env"
import { jobs } from "~/jobs"
import { startJobs } from "~/jobs/scheduler"
import { holdRunningLock } from "~/shared/db/running-lock"
import { verifyTransport } from "~/shared/mail/transport"

const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
})

await verifyTransport()

// Kept for the life of the process; a dropped connection loses the lock without a word (ponytail: re-take it on a timer if that ever matters).
const runningLock = await holdRunningLock()

const stopJobs = startJobs(jobs)

process.on("SIGTERM", () => {
  stopJobs()
  void server.stop().then(() => runningLock.close())
})
