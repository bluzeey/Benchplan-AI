import { fmtConfidence } from "@/lib/format"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { LiteratureQcRun } from "@/lib/schemas"

import { NoveltyBadge } from "./NoveltyBadge"
import { ReferenceCard } from "./ReferenceCard"

export function LiteratureQcCard({ run }: { run: Omit<LiteratureQcRun, "references"> & { references?: LiteratureQcRun["references"] } }) {
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
          {(run.references ?? []).slice(0, 8).map((reference) => (
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
