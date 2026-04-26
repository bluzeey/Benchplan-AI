import { useQuery } from "@tanstack/react-query"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { apiFetch } from "@/lib/api"

const SafetyAssessmentSchema = z.object({
  id: z.string(),
  state: z.string(),
  categories: z.array(z.string()),
  created_at: z.string(),
})

export function SettingsSourcesPage() {
  const safetyQuery = useQuery({
    queryKey: ["safety-assessments"],
    queryFn: () => apiFetch("/api/safety/assessments/", z.array(SafetyAssessmentSchema)),
  })

  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-semibold tracking-tight">Source and safety status</h2>

      <Card className="rounded-2xl border-border/70">
        <CardHeader>
          <CardTitle>External sources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Semantic Scholar: optional when API key is present</li>
            <li>OpenAlex: active fallback and primary without Semantic key</li>
            <li>PubMed E-utilities: available</li>
            <li>Europe PMC: available</li>
            <li>protocols.io: stubbed in MVP</li>
          </ul>
          <p className="border-t border-border/70 pt-3 text-xs font-mono text-muted-foreground">
            Retrieval channel: multi-source fallback
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/70">
        <CardHeader>
          <CardTitle>Recent safety triage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {safetyQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading safety assessments...</p> : null}
          {safetyQuery.error ? <p className="text-sm text-destructive">{(safetyQuery.error as Error).message}</p> : null}
          <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
            {safetyQuery.data?.map((item) => (
              <Card key={item.id} className="rounded-xl border-border/70 bg-background/60">
                <CardContent className="space-y-2 p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.12em] text-primary">{item.state}</p>
                  <p className="text-sm text-muted-foreground">{item.categories.join(", ") || "no categories"}</p>
                  <p className="border-t border-border/70 pt-2 text-xs font-mono text-muted-foreground">{item.created_at}</p>
                </CardContent>
              </Card>
            ))}
            {!safetyQuery.data?.length ? <p className="text-sm text-muted-foreground">No safety assessments available yet.</p> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
