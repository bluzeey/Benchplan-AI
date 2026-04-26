import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { z } from "zod"
import { FileText, ExternalLink } from "lucide-react"

import { LiteratureQcCard } from "@/components/scientist/LiteratureQcCard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { apiFetch, apiFetchRaw } from "@/lib/api"
import { AgentRunSchema, ExperimentPlanSchema, LiteratureQcRunSchema } from "@/lib/schemas"
import { queryKeys, invalidatePatterns } from "@/lib/query-keys"

const GeneratePlanResponseSchema = z.object({ agent_run_id: z.string(), plan_id: z.string() })

export function RunPage() {
  const { runId } = useParams()
  const [searchParams] = useSearchParams()
  const qcRunId = searchParams.get("qcRunId")
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null)

  const runQuery = useQuery({
    queryKey: queryKeys.agentRuns.detail(runId || ""),
    queryFn: () => apiFetch(`/api/agent-runs/${runId}/`, AgentRunSchema),
    enabled: Boolean(runId),
    staleTime: 5000,
    refetchInterval: (query) => (query.state.data?.status === "running" ? 2000 : false),
  })

  const qcQuery = useQuery({
    queryKey: queryKeys.qcRuns.detail(qcRunId),
    queryFn: () => apiFetch(`/api/literature-qc/${qcRunId}/`, LiteratureQcRunSchema),
    enabled: Boolean(qcRunId),
    staleTime: 5000,
    refetchInterval: (query) => (query.state.data?.status === "running" ? 2000 : false),
  })

  // Fetch the current plan if we have a plan_id
  const planQuery = useQuery({
    queryKey: queryKeys.plans.detail(currentPlanId || ""),
    queryFn: () => apiFetch(`/api/plans/${currentPlanId}/`, ExperimentPlanSchema),
    enabled: Boolean(currentPlanId),
    staleTime: 5000,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === "generating" ? 3000 : false
    },
  })

  const generatePlan = useMutation({
    mutationFn: async () => {
      const payload = await apiFetchRaw(`/api/literature-qc/${qcRunId}/generate-plan/`, { method: "POST" })
      return GeneratePlanResponseSchema.parse(payload)
    },
    onSuccess: (payload) => {
      setCurrentPlanId(payload.plan_id)
      // Invalidate plans list so sidebar and other pages update
      queryClient.invalidateQueries({ queryKey: invalidatePatterns.plans.all })
      // Navigate to the new run while preserving context
      navigate(`/runs/${payload.agent_run_id}?qcRunId=${qcRunId}`)
    },
  })

  // Auto-redirect only when plan is completed
  useEffect(() => {
    if (runQuery.data?.status === "completed" && runQuery.data.output_payload.plan_id) {
      const planId = runQuery.data.output_payload.plan_id as string
      setCurrentPlanId(planId)
      // Invalidate plan queries to refresh data across all pages
      queryClient.invalidateQueries({ queryKey: queryKeys.plans.detail(planId) })
      queryClient.invalidateQueries({ queryKey: invalidatePatterns.plans.all })
    }
  }, [runQuery.data, queryClient])

  // Determine plan status display
  const planStatus = planQuery.data?.status || (generatePlan.isPending ? "generating" : null)
  const statusColors: Record<string, string> = {
    generating: "bg-blue-500",
    completed: "bg-green-500",
    draft: "bg-gray-500",
    error: "bg-red-500",
  }

  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-semibold tracking-tight">Live run</h2>

      {/* Grid layout: Left column (Status + Plan), Right column (Literature QC) */}
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        {/* Left Column: Status and Plan */}
        <div className="space-y-4">
          {/* Live Run Status Card */}
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

          {/* Experiment Plan Card - shown when generating or when we have a plan */}
          {qcQuery.data?.status === "completed" && !currentPlanId && !generatePlan.isPending ? (
            <Card className="rounded-2xl border-border/70">
              <CardHeader className="space-y-2">
                <CardTitle>Experiment Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => generatePlan.mutate()} disabled={generatePlan.isPending} className="w-full">
                  {generatePlan.isPending ? "Generating..." : "Generate Experiment Plan"}
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {(planStatus || currentPlanId) && (
            <Card className="rounded-2xl border-border/70">
              <CardHeader className="space-y-2">
                <div className="flex items-center gap-2">
                  <CardTitle>Experiment Plan</CardTitle>
                  {planStatus && (
                    <Badge className={`${statusColors[planStatus] || "bg-gray-500"} text-white`}>
                      {planStatus === "generating" ? "Generating..." : planStatus}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {planQuery.data ? (
                  <>
                    <p className="text-sm font-medium">{planQuery.data.title}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {planQuery.data.executive_summary}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Creating plan record...</p>
                )}
                {currentPlanId && (
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/plans/${currentPlanId}`}>
                      <FileText className="mr-2 h-4 w-4" />
                      {planStatus === "completed" ? "View Plan" : "Open Current Plan"}
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Literature QC */}
        {qcQuery.data ? <LiteratureQcCard run={qcQuery.data} /> : null}
      </div>

      {runQuery.error ? <p className="text-sm text-destructive">{(runQuery.error as Error).message}</p> : null}
      {qcQuery.error ? <p className="text-sm text-destructive">{(qcQuery.error as Error).message}</p> : null}
    </div>
  )
}
