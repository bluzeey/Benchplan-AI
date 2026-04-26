import { useMutation, useQuery } from "@tanstack/react-query"
import { Link, useNavigate, useParams } from "react-router-dom"
import { z } from "zod"
import { FileText, Loader2, Plus, Clock, DollarSign } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { apiFetch, apiFetchRaw } from "@/lib/api"
import { ExperimentPlanSchema, ProjectSchema } from "@/lib/schemas"
import { cn } from "@/lib/utils"

const StartQcSchema = z.object({ qc_run_id: z.string(), agent_run_id: z.string() })

const PlanSchema = z.object({
  id: z.union([z.string(), z.number()]).transform((val) => String(val)),
  title: z.string(),
  status: z.string(),
  project: z.union([z.string(), z.number()]).transform((val) => String(val)),
  executive_summary: z.string().optional(),
  estimated_budget_min: z.union([z.number(), z.string()]).nullable().optional(),
  estimated_budget_max: z.union([z.number(), z.string()]).nullable().optional(),
  estimated_duration_weeks_min: z.number().nullable().optional(),
  estimated_duration_weeks_max: z.number().nullable().optional(),
  scientist_review_status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
})

const PlansListSchema = z.array(PlanSchema)

const statusColors: Record<string, string> = {
  draft: "bg-gray-500",
  generating: "bg-blue-500",
  completed: "bg-green-500",
  error: "bg-red-500",
}

const reviewStatusColors: Record<string, string> = {
  required: "bg-amber-500",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  pending: "bg-gray-500",
}

function formatCurrency(value: number | string | null | undefined): string {
  if (value == null) return "—"
  const num = typeof value === "string" ? parseFloat(value) : value
  if (isNaN(num)) return "—"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(num)
}

function formatDuration(min: number | null | undefined, max: number | null | undefined): string {
  if (min == null && max == null) return "—"
  if (min === max) return `${min} weeks`
  if (min == null) return `≤ ${max} weeks`
  if (max == null) return `≥ ${min} weeks`
  return `${min}–${max} weeks`
}

export function ProjectPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => apiFetch(`/api/projects/${projectId}/`, ProjectSchema),
    enabled: Boolean(projectId),
  })

  const plansQuery = useQuery({
    queryKey: ["plans-list"],
    queryFn: () => apiFetch("/api/plans/", PlansListSchema),
    enabled: Boolean(projectId),
  })

  const startQc = useMutation({
    mutationFn: async () => {
      const questionId = projectQuery.data?.questions?.[0]?.id
      if (!questionId) throw new Error("No question found for project")
      const payload = await apiFetchRaw(`/api/questions/${questionId}/literature-qc/`, { method: "POST" })
      return StartQcSchema.parse(payload)
    },
    onSuccess: (data) => navigate(`/runs/${data.agent_run_id}?qcRunId=${data.qc_run_id}&projectId=${projectId}`),
  })

  if (projectQuery.isLoading) return <p className="text-sm text-muted-foreground">Loading project...</p>
  if (projectQuery.error) return <p className="text-sm text-destructive">{(projectQuery.error as Error).message}</p>
  if (!projectQuery.data) return null

  const project = projectQuery.data
  const projectPlans = plansQuery.data?.filter((p) => p.project === projectId) ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight">{project.title}</h2>
        <p className="text-xs font-mono text-muted-foreground">Domain: {project.domain || "other"}</p>
      </div>

      {/* Hypothesis Card */}
      <Card className="rounded-2xl border-border/70">
        <CardHeader>
          <CardTitle>Hypothesis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>{project.questions?.[0]?.raw_text ?? "No hypothesis"}</p>
          <p className="border-t border-border/70 pt-3 text-xs font-mono">Question count: {project.questions?.length ?? 0}</p>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button onClick={() => startQc.mutate()} disabled={startQc.isPending}>
          {startQc.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Starting...
            </>
          ) : (
            "Run Literature QC"
          )}
        </Button>
      </div>

      {/* Plans Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Experiment Plans</h3>
          <span className="text-sm text-muted-foreground">{projectPlans.length} plan(s)</span>
        </div>

        {plansQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading plans...</p>
        ) : projectPlans.length === 0 ? (
          <Card className="rounded-2xl border-border/70">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No plans yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Run Literature QC to generate your first plan.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {projectPlans.map((plan) => (
              <Card
                key={plan.id}
                className="cursor-pointer rounded-2xl border-border/70 transition-colors hover:border-border"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-base">
                        <Link to={`/plans/${plan.id}`} className="hover:underline">
                          {plan.title}
                        </Link>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(plan.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant="default"
                      className={cn(
                        `${statusColors[plan.status] ?? "bg-gray-500"} text-white`,
                        plan.status === "generating" && "animate-pulse"
                      )}
                    >
                      {plan.status === "generating" ? (
                        <span className="inline-flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Generating...
                        </span>
                      ) : plan.status}
                    </Badge>
                    {plan.status === "completed" && (
                      <Badge
                        variant="default"
                        className={`${reviewStatusColors[plan.scientist_review_status] ?? "bg-gray-500"} text-white`}
                      >
                        {plan.scientist_review_status}
                      </Badge>
                    )}
                  </div>

                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {plan.executive_summary || "No description available"}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {formatCurrency(plan.estimated_budget_min)}
                      {plan.estimated_budget_max && plan.estimated_budget_max !== plan.estimated_budget_min
                        ? ` – ${formatCurrency(plan.estimated_budget_max)}`
                        : null}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(plan.estimated_duration_weeks_min, plan.estimated_duration_weeks_max)}
                    </span>
                  </div>

                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link to={`/plans/${plan.id}`}>
                      {plan.status === "generating" ? "View Progress" : "View Plan"}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
