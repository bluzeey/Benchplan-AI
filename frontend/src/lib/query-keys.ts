// Centralized query keys for React Query
// One endpoint = one key pattern = one canonical cache entry

export const queryKeys = {
  // Auth
  auth: {
    me: ["auth", "me"] as const,
  },

  // Projects
  projects: {
    all: ["projects"] as const,
    list: ["projects", "list"] as const,
    detail: (id: string | number) => ["projects", "detail", String(id)] as const,
  },

  // Plans
  plans: {
    all: ["plans"] as const,
    list: ["plans", "list"] as const,
    detail: (id: string | number) => ["plans", "detail", String(id)] as const,
    materials: (id: string | number) => ["plans", "materials", String(id)] as const,
    budget: (id: string | number) => ["plans", "budget", String(id)] as const,
    timeline: (id: string | number) => ["plans", "timeline", String(id)] as const,
  },

  // Reviews
  reviews: {
    all: ["reviews"] as const,
    list: ["reviews", "list"] as const,
    detail: (id: string | number) => ["reviews", "detail", String(id)] as const,
  },

  // Agent Runs
  agentRuns: {
    detail: (id: string | number) => ["agent-runs", "detail", String(id)] as const,
  },

  // Literature QC
  qcRuns: {
    detail: (id: string | number | null | undefined) =>
      id ? (["qc-runs", "detail", String(id)] as const) : (["qc-runs", "detail"] as const),
  },

  // Safety
  safety: {
    assessments: ["safety", "assessments"] as const,
  },
} as const

// Helper to invalidate all related lists after mutations
export const invalidatePatterns = {
  projects: {
    all: ["projects"],
    list: ["projects", "list"],
  },
  plans: {
    all: ["plans"],
    list: ["plans", "list"],
  },
  reviews: {
    all: ["reviews"],
    list: ["reviews", "list"],
  },
} as const
