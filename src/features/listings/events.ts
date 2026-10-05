import { useMutation } from "@tanstack/react-query"
import type { z } from "zod"

import { apiFetch, type ApiError } from "@/lib/api/client"
import { okSchema } from "@/schemas/api"
import type { eventInputSchema } from "@/schemas/inputs"

export const useTrackEvent = () =>
  useMutation<unknown, ApiError, z.input<typeof eventInputSchema>>({
    mutationFn: (body) =>
      apiFetch("/events", {
        method: "POST",
        body,
        schema: okSchema,
        keepalive: true,
      }),
  })
