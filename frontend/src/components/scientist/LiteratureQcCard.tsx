import { fmtConfidence } from "@/lib/format"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
    <Card className="rounded-2xl border-border/70">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Literature QC</CardTitle>
          <NoveltyBadge signal={run.novelty_signal} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="font-mono text-xs text-muted-foreground">Confidence: {fmtConfidence(confidence)}</p>
        <p className="text-sm text-muted-foreground">{run.summary || "Pending retrieval and evidence synthesis..."}</p>
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {(run.references ?? []).slice(0, 3).map((reference) => (
            <ReferenceCard key={reference.id} reference={reference} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
          <span>Evidence channel: semantic + open retrieval</span>
          <span className="font-mono">Top references: {(run.references ?? []).length}</span>
        </div>
      </CardContent>
    </Card>
  )
}
