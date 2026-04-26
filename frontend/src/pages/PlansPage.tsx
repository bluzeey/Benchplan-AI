import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { z } from "zod"
import { FileText, Clock, DollarSign, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { apiFetch } from "@/lib/api"

const PlanListItemSchema = z.object({
  id: z.union([z.string(), z.number()]).transform((val) => String(val)),
  title: z.string(),
  status: z.string(),
  project: z.union([z.string(), z.number()]).transform((val) => String(val)),
  project_title: z.string(),
  question_text: z.string().optional(),
  executive_summary: z.string().optional(),
  estimated_budget_min: z.union([z.number(), z.string()]).nullable().optional(),
  estimated_budget_max: z.union([z.number(), z.string()]).nullable().optional(),
  estimated_duration_weeks_min: z.number().nullable().optional(),
  estimated_duration_weeks_max: z.number().nullable().optional(),
  scientist_review_status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
})

const PlansListSchema = z.array(PlanListItemSchema)

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

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  const diffWeeks = Math.floor(diffDays / 7)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffWeeks < 4) return `${diffWeeks}w ago`
  return date.toLocaleDateString()
}

export function PlansPage() {
  const navigate = useNavigate()

  const plansQuery = useQuery({
    queryKey: ["plans-list"],
    queryFn: () => apiFetch("/api/plans/", PlansListSchema),
    refetchInterval: (query) => {
      // Auto-refresh if any plan is generating
      const data = query.state.data
      if (data && data.some((p) => p.status === "generating")) {
        return 3000 // Refresh every 3 seconds while generating
      }
      return false
    },
  })

  const plans = plansQuery.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-semibold tracking-tight">Plans</h2>
        <Button onClick={() => navigate("/dashboard")}>
          <FileText className="mr-2 h-4 w-4" />
          New Plan
        </Button>
      </div>

      {plansQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading plans...</p>
      ) : null}

      {plansQuery.error ? (
        <p className="text-sm text-destructive">
          {(plansQuery.error as Error).message}
        </p>
      ) : null}

      {!plansQuery.isLoading && !plansQuery.error && plans.length === 0 ? (
        <Card className="rounded-2xl border-border/70">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No plans yet.</p>
            <Button
              variant="link"
              onClick={() => navigate("/dashboard")}
              className="mt-2"
            >
              Create your first plan
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className="cursor-pointer rounded-2xl border-border/70 transition-colors hover:border-border"
            onClick={() => navigate(`/plans/${plan.id}`)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate text-base">{plan.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {plan.project_title} • {formatRelativeTime(plan.updated_at)}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="default"
                  className={`${statusColors[plan.status] ?? "bg-gray-500"} text-white`}
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
                {plan.executive_summary || plan.question_text || "No description available"}
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
