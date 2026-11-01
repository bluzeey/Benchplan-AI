export const MAX_HYPOTHESIS_DRAFT_LENGTH = 10_000
export const MAX_AUTH_DESTINATION_LENGTH = 2_048

type HypothesisDraft = { hypothesis: string }
type AuthNavigationState = { from: string; draft?: HypothesisDraft }

const UNSAFE_CHARACTERS = /[\\\u0000-\u001f\u007f-\u009f\u2028\u2029]/
// Keep this allowlist aligned with the protected routes in app/router.tsx.
const PROTECTED_PATH = /^\/(?:dashboard|projects(?:\/[a-z0-9_-]+)?|runs\/[a-z0-9_-]+|plans(?:\/[a-z0-9_-]+(?:\/review)?)?|reviews|analytics|settings(?:\/sources)?)\/?$/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

export function sanitizeProtectedDestination(from: unknown): string | undefined {
  let destination: unknown = from
  if (isRecord(from)) {
    const { pathname, search = "", hash = "" } = from
    if (
      typeof pathname !== "string" || /[?#]/.test(pathname) ||
      typeof search !== "string" || (search !== "" && !search.startsWith("?")) ||
      typeof hash !== "string" || (hash !== "" && !hash.startsWith("#")) ||
      pathname.length + search.length + hash.length > MAX_AUTH_DESTINATION_LENGTH
    ) return undefined
    destination = pathname + search + hash
  }

  if (
    typeof destination !== "string" ||
    destination.length > MAX_AUTH_DESTINATION_LENGTH ||
    UNSAFE_CHARACTERS.test(destination)
  ) return undefined

  // Check nested encodings too. Each decode shortens this bounded string.
  let decoded = destination
  while (true) {
    if (UNSAFE_CHARACTERS.test(decoded)) return undefined
    let next: string
    try {
      next = decodeURIComponent(decoded)
    } catch {
      // A literal percent produced by decoding is safe; malformed input is not.
      if (decoded === destination) return undefined
      break
    }
    if (next === decoded) break
    decoded = next
  }

  const pathname = destination.split(/[?#]/, 1)[0]
  return PROTECTED_PATH.test(pathname) ? destination : undefined
}

// Read only the hypothesis: never forward credentials, files, or arbitrary state.
export function getHypothesisDraft(state: unknown): HypothesisDraft | undefined {
  if (!isRecord(state) || !isRecord(state.draft) || typeof state.draft.hypothesis !== "string") {
    return undefined
  }
  let hypothesis = state.draft.hypothesis.slice(0, MAX_HYPOTHESIS_DRAFT_LENGTH)
  // Do not cut a Unicode character in half at the size limit.
  if (/[\ud800-\udbff]$/.test(hypothesis)) hypothesis = hypothesis.slice(0, -1)
  return hypothesis.trim() ? { hypothesis } : undefined
}

export function getAuthNavigationState(state: unknown): AuthNavigationState {
  const draft = getHypothesisDraft(state)
  // A landing draft always needs explicit review on the new-project form.
  const from = draft
    ? "/projects/new"
    : sanitizeProtectedDestination(isRecord(state) ? state.from : undefined) ?? "/dashboard"
  return draft ? { from, draft } : { from }
}

export function getAuthDestination(state: unknown): { to: string; state?: { draft: HypothesisDraft } } {
  const { from, draft } = getAuthNavigationState(state)
  return { to: from, state: draft ? { draft } : undefined }
}
