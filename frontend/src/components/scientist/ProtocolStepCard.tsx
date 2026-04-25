import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ProtocolStep } from "@/lib/schemas"

export function ProtocolStepCard({ step }: { step: ProtocolStep }) {
  return (
    <Card className="rounded-xl border-border/70">
      <CardHeader className="space-y-2 p-4 pb-0">
        <CardTitle className="text-base">
          {step.step_number}. {step.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-4">
        <p className="text-sm text-muted-foreground">{step.description}</p>
        <p className="text-xs text-muted-foreground">Duration: {step.duration_minutes ?? "-"} minutes</p>
        <p className="text-xs text-muted-foreground">Expected output: {step.expected_output}</p>
        <div className="flex flex-wrap gap-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
          <span>Equipment: {(step.equipment ?? []).join(", ") || "not specified"}</span>
          <span className="font-mono">Safety: {step.safety_notes || "review required"}</span>
        </div>
      </CardContent>
    </Card>
  )
}
