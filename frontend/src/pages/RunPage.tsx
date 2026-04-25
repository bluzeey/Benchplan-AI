import { useMutation, useQuery } from "@tanstack/react-query"
import { useEffect } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { z } from "zod"

import { LiteratureQcCard } from "@/components/scientist/LiteratureQcCard"
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
    <div className="stack">
      <h2>Live run</h2>
      {runQuery.data ? (
        <section className="card">
          <h3>Status</h3>
          <div className="metadata-strip">
            <span className="mono">Run state: {runQuery.data.status}</span>
            <span className="mono">Events: {(runQuery.data.events ?? []).length}</span>
          </div>
          <div className="timeline-log">
            {(runQuery.data.events ?? []).map((event) => (
              <p key={event.id}>{event.created_at} • {event.label}</p>
            ))}
          </div>
        </section>
      ) : null}

      {qcQuery.data ? <LiteratureQcCard run={qcQuery.data} /> : null}

      {qcQuery.data?.status === "completed" ? (
        <button onClick={() => generatePlan.mutate()} disabled={generatePlan.isPending}>
          {generatePlan.isPending ? "Generating..." : "Generate Experiment Plan"}
        </button>
      ) : null}

      {runQuery.error ? <p className="error">{(runQuery.error as Error).message}</p> : null}
      {qcQuery.error ? <p className="error">{(qcQuery.error as Error).message}</p> : null}
    </div>
  )
}
