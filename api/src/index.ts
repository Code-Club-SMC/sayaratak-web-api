import { app } from "~/app"
import { env } from "~/env"

const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
})

process.on("SIGTERM", () => void server.stop())
