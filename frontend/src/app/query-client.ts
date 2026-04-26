import { QueryCache, MutationCache, QueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

function extractErrorMessage(error: unknown): string {
  if (!error) return "Something went wrong"
  
  // Handle Error objects
  if (error instanceof Error) {
    return error.message
  }
  
  // Handle API error responses
  const err = error as Record<string, unknown>
  
  if (err.detail && typeof err.detail === "string") {
    return err.detail
  }
  
  if (err.detail && Array.isArray(err.detail)) {
    return err.detail.join(" ")
  }
  
  // Field errors
  const fieldErrors: string[] = []
  for (const [key, value] of Object.entries(err)) {
    if (key === "detail" || key === "non_field_errors") continue
    if (Array.isArray(value)) {
      fieldErrors.push(`${key}: ${value.join(" ")}`)
    } else if (typeof value === "string") {
      fieldErrors.push(`${key}: ${value}`)
    }
  }
  
  if (fieldErrors.length > 0) {
    return fieldErrors.join(" | ")
  }
  
  if (err.non_field_errors && Array.isArray(err.non_field_errors)) {
    return err.non_field_errors.join(" ")
  }
  
  return "Something went wrong"
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry failed requests once after 1 second delay
      retry: 1,
      retryDelay: 1000,
      // Keep data fresh for 60 seconds before refetching
      staleTime: 60_000,
      // Keep inactive data in cache for 5 minutes
      gcTime: 5 * 60_000,
      // Don't refetch on window focus (better UX)
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect (we have staleTime)
      refetchOnReconnect: false,
      // Don't refetch on mount if data is fresh
      refetchOnMount: false,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      retryDelay: 1000,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Skip if query has meta.skipToast
      if (query.meta?.skipToast) return
      
      const message = extractErrorMessage(error)
      toast.error("Failed to load data", {
        description: message,
      })
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      // Skip if mutation has meta.skipToast
      if (mutation.meta?.skipToast) return
      
      const message = extractErrorMessage(error)
      toast.error("Action failed", {
        description: message,
      })
    },
  }),
})
