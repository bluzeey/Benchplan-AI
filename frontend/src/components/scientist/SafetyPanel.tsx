import { AlertTriangle } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Props = {
  risks: unknown[]
}

export function SafetyPanel({ risks }: Props) {
  return (
    <Card className="rounded-2xl border-border/70">
      <CardHeader className="pb-2">
        <CardTitle>Risks &amp; safety</CardTitle>
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
        <pre className="max-h-80 overflow-auto rounded-xl border border-border/70 bg-background/70 p-3 text-xs text-muted-foreground">
          {JSON.stringify(risks, null, 2)}
        </pre>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">Risk entries: {risks.length}</span>
          <span>Flag high-risk items for human oversight</span>
        </div>
      </CardContent>
    </Card>
  )
}
