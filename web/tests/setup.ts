import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

afterEach(cleanup)

process.env.MOCK_LATENCY_MS = "0"
