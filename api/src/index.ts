import { app } from "~/app"
import { env } from "~/env"
import { verifyTransport } from "~/shared/mail/transport"

const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
})

await verifyTransport()

process.on("SIGTERM", () => void server.stop())
