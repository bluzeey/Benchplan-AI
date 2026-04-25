import { useMutation, useQuery } from "@tanstack/react-query"
import { useEffect } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { z } from "zod"

import { LiteratureQcCard } from "@/components/scientist/LiteratureQcCard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { apiFetch, apiFetchRaw } from "@/lib/api"
import { AgentRunSchema, LiteratureQcRunSchema } from "@/lib/schemas"

const GeneratePlanResponseSchema = z.object({ agent_run_id: z.string() })

export function RunPage() {
  const { runId } = useParams()
  const [searchParams] = useSearchParams()
  const qcRunId = searchParams.get("qcRunId")
  const navigate = useNavigate()

  const runQuery = useQuery({
    queryKey: ["agent-run", runId],
    queryFn: () => apiFetch(`/api/agent-runs/${runId}/`, AgentRunSchema),
    enabled: Boolean(runId),
    refetchInterval: (query) => (query.state.data?.status === "running" ? 2000 : false),
  })

  const qcQuery = useQuery({
    queryKey: ["qc-run", qcRunId],
    queryFn: () => apiFetch(`/api/literature-qc/${qcRunId}/`, LiteratureQcRunSchema),
    enabled: Boolean(qcRunId),
    refetchInterval: (query) => (query.state.data?.status === "running" ? 2000 : false),
  })

  const generatePlan = useMutation({
    mutationFn: async () => {
      const payload = await apiFetchRaw(`/api/literature-qc/${qcRunId}/generate-plan/`, { method: "POST" })
      return GeneratePlanResponseSchema.parse(payload)
    },
    onSuccess: (payload) => navigate(`/runs/${payload.agent_run_id}?qcRunId=${qcRunId}`),
  })

  useEffect(() => {
    if (runQuery.data?.status === "completed" && runQuery.data.output_payload.plan_id) {
      navigate(`/plans/${runQuery.data.output_payload.plan_id}`)
    }
  }, [navigate, runQuery.data])

  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-semibold tracking-tight">Live run</h2>
      {runQuery.data ? (
        <Card className="rounded-2xl border-border/70">
          <CardHeader className="space-y-2">
            <CardTitle>Status</CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">Run state: {runQuery.data.status}</span>
              <span className="font-mono">Events: {(runQuery.data.events ?? []).length}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mask-fade-bottom max-h-64 space-y-2 overflow-auto rounded-xl border border-border/70 bg-background/50 p-3">
            {(runQuery.data.events ?? []).map((event) => (
              <p key={event.id} className="font-mono text-xs text-muted-foreground">
                {event.created_at} - {event.label}
              </p>
            ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {qcQuery.data ? <LiteratureQcCard run={qcQuery.data} /> : null}

      {qcQuery.data?.status === "completed" ? (
        <Button onClick={() => generatePlan.mutate()} disabled={generatePlan.isPending}>
          {generatePlan.isPending ? "Generating..." : "Generate Experiment Plan"}
        </Button>
      ) : null}

      {runQuery.error ? <p className="text-sm text-destructive">{(runQuery.error as Error).message}</p> : null}
      {qcQuery.error ? <p className="text-sm text-destructive">{(qcQuery.error as Error).message}</p> : null}
    </div>
  )
}
