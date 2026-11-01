import { useQuery } from "@tanstack/react-query"
import { z } from "zod"

import { apiFetch } from "@/lib/api"

const CapabilitiesSchema = z.object({
  ai_available: z.boolean(),
  message: z.string().nullable(),
}).strict()

const unavailableMessage = "AI is currently unavailable. You can still create and view private projects."

export function useAiAvailability() {
  const query = useQuery({
    queryKey: ["capabilities"],
    queryFn: ({ signal }) => apiFetch("/api/capabilities/", CapabilitiesSchema, { signal }),
    staleTime: 30_000,
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    meta: { skipToast: true },
  })

  const aiAvailable = query.isSuccess && query.data.ai_available === true
  const message = aiAvailable
    ? null
    : query.isPending
      ? "Checking AI availability. You can still create and view private projects."
      : query.isError
        ? "AI status is unavailable. You can still create and view private projects."
        : query.data?.message?.trim() || unavailableMessage

  return { aiAvailable, message }
}
