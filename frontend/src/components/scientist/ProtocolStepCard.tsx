import { z } from "zod"

import { ProtocolStepSchema } from "@/lib/schemas"

type ProtocolStep = z.infer<typeof ProtocolStepSchema>

export function ProtocolStepCard({ step }: { step: ProtocolStep }) {
  return (
    <article className="card compact">
      <h4>
        {step.step_number}. {step.title}
      </h4>
      <p>{step.description}</p>
      <p className="muted">Duration: {step.duration_minutes ?? "-"} minutes</p>
      <p className="muted">Expected output: {step.expected_output}</p>
    </article>
  )
}
