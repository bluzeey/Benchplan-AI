import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type ReviewSession = {
  status: string
  annotations?: Array<{
    id: string
    correction_type: string
    corrected_text: string
    rationale: string
  }>
}

export function ReviewPanel({ review }: { review: ReviewSession }) {
  return (
    <Card className="rounded-2xl border-border/70">
      <CardHeader className="space-y-3">
        <CardTitle>Review annotations</CardTitle>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">Status: {review.status}</span>
          <span className="font-mono">Annotations: {(review.annotations ?? []).length}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {(review.annotations ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No annotations yet.</p> : null}
        {(review.annotations ?? []).map((annotation) => (
          <article key={annotation.id} className="space-y-1 rounded-xl border border-border/70 bg-background/60 p-3">
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-primary">{annotation.correction_type}</p>
            <p className="text-sm text-foreground">{annotation.corrected_text}</p>
            <p className="text-xs text-muted-foreground">{annotation.rationale}</p>
          </article>
        ))}
      </CardContent>
    </Card>
  )
}
