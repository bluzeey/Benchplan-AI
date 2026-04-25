import { fmtConfidence } from "@/lib/format"

import { NoveltyBadge } from "./NoveltyBadge"
import { ReferenceCard } from "./ReferenceCard"

type Run = {
  novelty_signal: "not_found" | "similar_work_exists" | "exact_match_found" | "inconclusive" | null
  confidence: number | string | null
  summary: string | null
  references?: Array<{
    id: string
    title: string
    source: string
    year: number | null
    doi?: string | null
    url?: string | null
    relevance_score?: number | string | null
    why_relevant?: string
    match_json?: Record<string, string>
  }>
}

export function LiteratureQcCard({ run }: { run: Run }) {
  const confidence = run.confidence == null ? null : Number(run.confidence)

  return (
    <section className="card">
      <div className="row">
        <h3>Literature QC</h3>
        <NoveltyBadge signal={run.novelty_signal} />
      </div>
      <p>Confidence: {fmtConfidence(confidence)}</p>
      <p>{run.summary}</p>
      <div className="grid two">
        {(run.references ?? []).slice(0, 3).map((reference) => (
          <ReferenceCard key={reference.id} reference={reference} />
        ))}
      </div>
    </section>
  )
}
