import { z } from "zod"

import { TimelinePhaseSchema } from "@/lib/schemas"

type TimelinePhase = z.infer<typeof TimelinePhaseSchema>

export function TimelineView({ phases }: { phases: TimelinePhase[] }) {
  return (
    <div className="card">
      <h3>Timeline</h3>
      {phases.map((phase) => (
        <div key={phase.id} className="timeline-item">
          <strong>
            {phase.phase_number}. {phase.title}
          </strong>
          <p>
            Week {phase.start_week} to {phase.end_week} • {phase.parallelizable ? "Parallelizable" : "Sequential"}
          </p>
          <p className="muted">Risk: {phase.risk_of_delay} • Mitigation: {phase.mitigation}</p>
        </div>
      ))}
    </div>
  )
}
