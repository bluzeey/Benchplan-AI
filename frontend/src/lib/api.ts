import { z } from "zod"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"

export async function apiFetch<T>(path: string, schema: z.ZodSchema<T>, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error((error as { detail?: string }).detail || `Request failed: ${res.status}`)
  }

  const data = await res.json()
  return schema.parse(data)
}

export async function apiFetchRaw(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error((error as { detail?: string }).detail || `Request failed: ${res.status}`)
  }

  return res.json()
}

export { API_BASE_URL }
