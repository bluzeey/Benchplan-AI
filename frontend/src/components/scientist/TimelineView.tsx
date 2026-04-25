import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { TimelinePhase } from "@/lib/schemas"

export function TimelineView({ phases }: { phases: TimelinePhase[] }) {
  return (
    <Card className="rounded-2xl border-border/70">
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {phases.map((phase) => (
          <div key={phase.id} className="rounded-xl border border-border/70 bg-background/50 p-3">
            <p className="text-sm font-semibold">
              {phase.phase_number}. {phase.title}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Week {phase.start_week} to {phase.end_week} - {phase.parallelizable ? "Parallelizable" : "Sequential"}
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">Dependencies: {phase.dependencies.length ? phase.dependencies.join(", ") : "none"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Risk: {phase.risk_of_delay} - Mitigation: {phase.mitigation}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
