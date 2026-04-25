import { LiteratureSignalSchema } from "@/lib/schemas"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"

type Signal = z.infer<typeof LiteratureSignalSchema>

const labels: Record<Signal, string> = {
  not_found: "Not found",
  similar_work_exists: "Similar work exists",
  exact_match_found: "Exact match found",
  inconclusive: "Inconclusive",
}

export function NoveltyBadge({ signal }: { signal: Signal | null | undefined }) {
  if (!signal) return <Badge variant="default">Pending</Badge>

  const variant =
    signal === "not_found"
      ? "primary"
      : signal === "exact_match_found"
        ? "success"
        : signal === "similar_work_exists"
          ? "warning"
          : "default"

  return <Badge variant={variant}>{labels[signal]}</Badge>
}
