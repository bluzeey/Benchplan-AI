import { AlertTriangle } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Risk = {
  category?: string
  state?: string
  required_approvals?: string[]
}

type Props = {
  risks: Risk[] | unknown[]
}

// Helper to humanize snake_case strings
function humanize(text: string | undefined): string {
  if (!text) return "Unknown"
  return text
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

// Get risk level badge color
function getRiskColor(state: string | undefined): string {
  if (!state) return "text-muted-foreground"
  const normalized = state.toLowerCase()
  if (normalized.includes("low") || normalized.includes("clear")) return "text-emerald-500"
  if (normalized.includes("medium") || normalized.includes("pending")) return "text-amber-500"
  if (normalized.includes("high") || normalized.includes("block")) return "text-destructive"
  return "text-muted-foreground"
}

export function SafetyPanel({ risks }: Props) {
  const riskList = (risks || []) as Risk[]
  const hasRisks = riskList.length > 0

  return (
    <Card className="rounded-2xl border-border/70">
      <CardHeader className="pb-2">
        <CardTitle>Risks &amp; Safety</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-xl border border-amber-400/35 bg-amber-500/10 p-3 text-sm text-amber-300">
          <p className="inline-flex items-center gap-2 font-medium">
            <AlertTriangle size={15} />
            Draft guidance only
          </p>
          <p className="mt-1 text-xs text-amber-200/90">
            Confirm biosafety, ethics, chemical hygiene, supplier, and institutional requirements before any execution.
          </p>
        </div>

        {hasRisks ? (
          <div className="space-y-3">
            {riskList.map((risk, index) => (
              <div key={index} className="rounded-xl border border-border/70 bg-background/70 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-sm font-semibold ${getRiskColor(risk.state)}`}>
                    {humanize(risk.state)}
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-sm">{humanize(risk.category)}</span>
                </div>
                {risk.required_approvals?.length ? (
                  <div className="mt-2">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-1">
                      Required Approvals
                    </p>
                    <ul className="space-y-1">
                      {risk.required_approvals.map((approval, i) => (
                        <li key={i} className="text-xs flex items-start gap-2">
                          <span className="text-muted-foreground">•</span>
                          {approval}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No risk assessments available yet.</p>
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">Risk entries: {riskList.length}</span>
          <span>Flag high-risk items for human oversight</span>
        </div>
      </CardContent>
    </Card>
  )
}
