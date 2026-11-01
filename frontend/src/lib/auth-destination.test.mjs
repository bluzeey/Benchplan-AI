import assert from "node:assert/strict"
import { test } from "node:test"

import {
  getAuthDestination,
  getAuthNavigationState,
  getHypothesisDraft,
  MAX_AUTH_DESTINATION_LENGTH,
  MAX_HYPOTHESIS_DRAFT_LENGTH,
  sanitizeProtectedDestination,
} from "./auth-destination.ts"

test("preserves recognized protected routes and deep-link query/hash", () => {
  const destinations = [
    "/dashboard", "/projects", "/projects/new", "/projects/abc-123_456",
    "/runs/123?qcRunId=qc-456&projectId=project-789#progress",
    "/plans", "/plans/plan-123", "/plans/plan-123/review",
    "/reviews", "/analytics", "/settings", "/settings/sources",
    "/projects/ABC-123/", "/dashboard?label=50%25#overview",
  ]
  for (const destination of destinations) {
    assert.equal(sanitizeProtectedDestination(destination), destination)
    assert.deepEqual(getAuthDestination({ from: destination }), { to: destination, state: undefined })
  }
})

test("accepts the existing React Router from location without copying its state", () => {
  const from = {
    pathname: "/plans/plan-123/review",
    search: "?projectId=project-456",
    hash: "#comments",
    state: { password: "must not propagate", draft: { hypothesis: "must not propagate" } },
    key: "router-key",
  }
  const authState = getAuthNavigationState({ from, email: "must not propagate" })
  assert.deepEqual(authState, { from: "/plans/plan-123/review?projectId=project-456#comments" })
  assert.deepEqual(getAuthDestination(authState), { to: authState.from, state: undefined })
})

test("rejects open redirects, auth loops, unknown routes, and ambiguous paths", () => {
  const rejected = [
    "https://evil.example/projects/new", "http://evil.example", "javascript:alert(1)",
    "//evil.example", "///evil.example/dashboard", "\\\\evil.example", "/\\evil.example",
    "/login", "/login?from=/projects", "/signup", "/SIGNUP/", "/", "/missing",
    "dashboard", " /dashboard", "/dashboard/../login", "/projects/../login",
    "/projects/%2e%2e/login", "/projects/%2F%2Fevil.example", "/%64ashboard",
    "/projects/a/extra", "/plans/a/review/extra", "/settings/unknown", "/api/projects/",
    "/dashboard\n", "/dashboard?x=\t", "/dashboard#\u0000", "/dashboard?x=\u007f",
    "/dashboard?x=\u0085", "/dashboard?x=\u2028", "/dashboard?x=\u2029",
    "/dashboard?x=\\evil", "/dashboard?x=%0a",
    "/dashboard?x=%5c", "/dashboard#%C2%85", "/dashboard?x=%250d%250a",
    "/dashboard?x=%25255c", "/dashboard?x=%25%35%63", "/dashboard?x=%ZZ",
  ]
  for (const destination of rejected) {
    assert.equal(sanitizeProtectedDestination(destination), undefined, JSON.stringify(destination))
    assert.deepEqual(getAuthDestination({ from: destination }), { to: "/dashboard", state: undefined })
  }
})

test("validates location objects and bounds destination size", () => {
  const rejected = [
    null, undefined, 42, [], {}, { pathname: "/login" },
    { pathname: "https://evil.example" }, { pathname: "/dashboard?ignored=yes" },
    { pathname: "/dashboard#ignored" }, { pathname: "/dashboard", search: "//evil.example" },
    { pathname: "/dashboard", hash: "?wrong-prefix" },
    { pathname: "/dashboard", search: null }, { pathname: "/dashboard", hash: {} },
    { pathname: "/dashboard", search: "?x=%5c" },
  ]
  for (const destination of rejected) {
    assert.equal(sanitizeProtectedDestination(destination), undefined)
  }
  const atLimit = "/dashboard?x=".padEnd(MAX_AUTH_DESTINATION_LENGTH, "a")
  assert.equal(sanitizeProtectedDestination(atLimit), atLimit)
  assert.equal(sanitizeProtectedDestination(atLimit + "a"), undefined)
  assert.equal(sanitizeProtectedDestination({ pathname: "/dashboard", search: "?x=" + "a".repeat(MAX_AUTH_DESTINATION_LENGTH) }), undefined)
})

test("carries a landing draft through both auth links and redirects to review only", () => {
  const hypothesis = "Compared to controls, treatment will improve viability by 20% after 4 weeks."
  let authState = getAuthNavigationState({ draft: { hypothesis } })
  for (let authSwitch = 0; authSwitch < 4; authSwitch++) {
    authState = getAuthNavigationState(authState)
    assert.deepEqual(authState, { from: "/projects/new", draft: { hypothesis } })
  }
  const destination = getAuthDestination(authState)
  assert.deepEqual(destination, { to: "/projects/new", state: { draft: { hypothesis } } })
  assert.deepEqual(getHypothesisDraft(destination.state), { hypothesis })
  assert.equal(destination.to.includes(hypothesis), false)
  // The protected layout can carry the draft back through auth after session loss.
  assert.deepEqual(getAuthNavigationState({
    from: { pathname: destination.to, search: "", hash: "" },
    draft: getHypothesisDraft(destination.state),
  }), authState)
})

test("a draft overrides run/plan/external destinations and forwards only its text", () => {
  const hypothesis = "Review this hypothesis before creating a project."
  for (const from of ["/runs/run-123", "/plans/plan-123", "https://evil.example", "/login"]) {
    const state = {
      from,
      draft: { hypothesis, attachments: [{ url: "private-file" }], password: "secret" },
      email: "private@example.test", password: "secret", password_confirm: "secret",
      autoStart: true, qcRunId: "must not propagate",
    }
    assert.deepEqual(getAuthNavigationState(state), { from: "/projects/new", draft: { hypothesis } })
    assert.deepEqual(getAuthDestination(state), { to: "/projects/new", state: { draft: { hypothesis } } })
  }
})

test("bounds draft text at every hop without mutating source state", () => {
  const hypothesis = "a".repeat(MAX_HYPOTHESIS_DRAFT_LENGTH + 100)
  const source = { from: "/runs/run-123", draft: { hypothesis } }
  const expected = "a".repeat(MAX_HYPOTHESIS_DRAFT_LENGTH)
  assert.equal(getHypothesisDraft(source).hypothesis, expected)
  assert.equal(getAuthNavigationState(source).draft.hypothesis, expected)
  assert.equal(getAuthDestination(source).state.draft.hypothesis, expected)
  assert.equal(source.draft.hypothesis, hypothesis)
  const unicode = { draft: { hypothesis: "🧬".repeat(MAX_HYPOTHESIS_DRAFT_LENGTH) } }
  assert.equal(getHypothesisDraft(unicode).hypothesis.length, MAX_HYPOTHESIS_DRAFT_LENGTH)
  const atUnicodeBoundary = "a".repeat(MAX_HYPOTHESIS_DRAFT_LENGTH - 1)
  assert.equal(getHypothesisDraft({ draft: { hypothesis: atUnicodeBoundary + "🧬" } }).hypothesis, atUnicodeBoundary)
})

test("ignores malformed/empty drafts and defaults safely for missing state", () => {
  const malformed = [
    null, undefined, [], "draft", 42, {}, { draft: [] }, { draft: "hypothesis" },
    { draft: {} }, { draft: { hypothesis: null } }, { draft: { hypothesis: 123 } },
    { draft: { hypothesis: "" } }, { draft: { hypothesis: " \n\t " } },
    { draft: { hypothesis: " ".repeat(MAX_HYPOTHESIS_DRAFT_LENGTH) + "out of bounds" } },
  ]
  for (const state of malformed) {
    assert.equal(getHypothesisDraft(state), undefined)
    assert.deepEqual(getAuthNavigationState(state), { from: "/dashboard" })
    assert.deepEqual(getAuthDestination(state), { to: "/dashboard", state: undefined })
  }
  assert.deepEqual(getAuthNavigationState({ from: "/settings/sources", draft: { hypothesis: 123 } }), { from: "/settings/sources" })
  assert.deepEqual(getHypothesisDraft({ draft: { hypothesis: "  keep draft spacing  " } }), { hypothesis: "  keep draft spacing  " })
})
