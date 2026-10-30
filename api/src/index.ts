import { app } from "~/app"

const server = Bun.serve({
  port: Number(process.env.PORT ?? 4000),
  fetch: app.fetch,
})

process.on("SIGTERM", () => void server.stop())
