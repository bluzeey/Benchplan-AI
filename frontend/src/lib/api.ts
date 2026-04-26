import { z } from "zod"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"

// Store CSRF token in memory
let csrfToken: string | null = null
let csrfTokenRequest: Promise<string | null> | null = null

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

function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {}

  const normalized: Record<string, string> = {}
  const parsedHeaders = new Headers(headers)
  parsedHeaders.forEach((value, key) => {
    normalized[key] = value
  })
  return normalized
}

function hasHeader(headers: Record<string, string>, headerName: string): boolean {
  const target = headerName.toLowerCase()
  return Object.keys(headers).some((key) => key.toLowerCase() === target)
}

// Build headers - only include Content-Type when there's a body
function buildHeaders(options: RequestInit, includeCsrf: boolean = false): Record<string, string> {
  const headers = normalizeHeaders(options.headers)

  // Only add Content-Type if we're sending a body and it's not FormData
  if (options.body && typeof options.body === "string" && !hasHeader(headers, "Content-Type")) {
    headers["Content-Type"] = "application/json"
  }

  // Add CSRF token for mutating requests
  if (includeCsrf && csrfToken) {
    headers["X-CSRFToken"] = csrfToken
  }

  return headers
}

// Fetch CSRF token from backend
async function fetchCsrfToken(): Promise<string | null> {
  if (csrfToken) {
    return csrfToken
  }

  if (csrfTokenRequest) {
    return csrfTokenRequest
  }

  csrfTokenRequest = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/csrf/`, {
        credentials: "include",
      })
      if (res.ok) {
        const data = await res.json()
        csrfToken = data.csrfToken || null
        return csrfToken
      }
    } catch (e) {
      console.error("Failed to fetch CSRF token:", e)
    }
    return null
  })()

  try {
    return await csrfTokenRequest
  } finally {
    csrfTokenRequest = null
  }
}

export async function ensureCsrfToken(): Promise<string | null> {
  if (csrfToken) {
    return csrfToken
  }
  return fetchCsrfToken()
}

// Determine if a request method needs CSRF protection
function needsCsrf(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase())
}

// Helper to check if error is CSRF related
function isCsrfError(error: Record<string, unknown>): boolean {
  const detail = String(error.detail || "").toLowerCase()
  return detail.includes("csrf") || detail.includes("forbidden")
}

export async function apiFetch<T>(path: string, schema: z.ZodSchema<T>, options: RequestInit = {}, retryCount = 0): Promise<T> {
  const method = options.method || "GET"
  const includeCsrf = needsCsrf(method)

  // Fetch CSRF token if needed and not already have one
  if (includeCsrf && !csrfToken) {
    await ensureCsrfToken()
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: buildHeaders(options, includeCsrf),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))

    // If CSRF error and we haven't retried yet, refresh token and retry once
    if (res.status === 403 && isCsrfError(error) && retryCount < 1 && includeCsrf) {
      console.log("CSRF token expired, refreshing...")
      await refreshCsrfToken()
      return apiFetch(path, schema, options, retryCount + 1)
    }

    throw new Error(extractErrorMessage(error, res.status))
  }

  const data = await res.json()
  return schema.parse(data)
}

export async function apiFetchRaw(path: string, options: RequestInit = {}, retryCount = 0) {
  const method = options.method || "GET"
  const includeCsrf = needsCsrf(method)

  // Fetch CSRF token if needed and not already have one
  if (includeCsrf && !csrfToken) {
    await ensureCsrfToken()
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: buildHeaders(options, includeCsrf),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))

    // If CSRF error and we haven't retried yet, refresh token and retry once
    if (res.status === 403 && isCsrfError(error) && retryCount < 1 && includeCsrf) {
      console.log("CSRF token expired, refreshing...")
      await refreshCsrfToken()
      return apiFetchRaw(path, options, retryCount + 1)
    }

    throw new Error(extractErrorMessage(error, res.status))
  }

  return res.json()
}

// Reset CSRF token (call on logout)
export function resetCsrfToken() {
  csrfToken = null
  csrfTokenRequest = null
}

// Refresh CSRF token after login/signup (token gets rotated by Django)
export async function refreshCsrfToken(): Promise<string | null> {
  resetCsrfToken()
  return fetchCsrfToken()
}

export { API_BASE_URL }
