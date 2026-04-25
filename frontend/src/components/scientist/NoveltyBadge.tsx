import { LiteratureSignalSchema } from "@/lib/schemas"
import { z } from "zod"

type Signal = z.infer<typeof LiteratureSignalSchema>

const labels: Record<Signal, string> = {
  not_found: "Not found",
  similar_work_exists: "Similar work exists",
  exact_match_found: "Exact match found",
  inconclusive: "Inconclusive",
}

export function NoveltyBadge({ signal }: { signal: Signal | null | undefined }) {
  if (!signal) return <span className="badge">Pending</span>
  return <span className={`badge badge-${signal}`}>{labels[signal]}</span>
}
