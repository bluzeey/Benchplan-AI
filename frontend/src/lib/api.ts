import { z } from "zod"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"

// Helper to extract human-readable error message from DRF validation errors
function extractErrorMessage(error: unknown, status: number): string {
  if (!error || typeof error !== "object") {
    return `Request failed: ${status}`
  }

  const err = error as Record<string, unknown>

  // DRF non_field_errors
  if (err.detail && typeof err.detail === "string") {
    return err.detail
  }
  if (err.detail && Array.isArray(err.detail)) {
    return err.detail.join(" ")
  }

  // DRF field errors - extract first error message
  const fieldErrors: string[] = []
  for (const [key, value] of Object.entries(err)) {
    if (key === "detail") continue
    if (Array.isArray(value)) {
      fieldErrors.push(`${value.join(" ")}`)
    } else if (typeof value === "string") {
      fieldErrors.push(value)
    }
  }

  if (fieldErrors.length > 0) {
    return fieldErrors.join(" ")
  }

  // Non-field errors array
  if (err.non_field_errors && Array.isArray(err.non_field_errors)) {
    return err.non_field_errors.join(" ")
  }

  return `Request failed: ${status}`
}

// Build headers - only include Content-Type when there's a body
function buildHeaders(options: RequestInit): Record<string, string> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  }

  // Only add Content-Type if we're sending a body and it's not FormData
  if (options.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json"
  }

  return headers
}

export async function apiFetch<T>(path: string, schema: z.ZodSchema<T>, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: buildHeaders(options),
    ...options,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(extractErrorMessage(error, res.status))
  }

  const data = await res.json()
  return schema.parse(data)
}

export async function apiFetchRaw(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: buildHeaders(options),
    ...options,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(extractErrorMessage(error, res.status))
  }

  return res.json()
}

export { API_BASE_URL }
