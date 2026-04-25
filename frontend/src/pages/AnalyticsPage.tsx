import { useQuery } from "@tanstack/react-query"
import { z } from "zod"
import {
  FolderOpen,
  FileText,
  CheckCircle,
  BarChart3,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { apiFetch } from "@/lib/api"

const ProjectSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string(),
  domain: z.string().nullable().optional(),
  created_at: z.string(),
})

const ProjectsListSchema = z.array(ProjectSchema)

const PlanSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string(),
  status: z.string(),
  estimated_budget_min: z.union([z.number(), z.string()]).nullable().optional(),
  estimated_budget_max: z.union([z.number(), z.string()]).nullable().optional(),
  estimated_duration_weeks_min: z.number().nullable().optional(),
  estimated_duration_weeks_max: z.number().nullable().optional(),
  scientist_review_status: z.string(),
  created_at: z.string(),
})

const PlansListSchema = z.array(PlanSchema)

const ReviewSchema = z.object({
  id: z.union([z.string(), z.number()]),
  status: z.string(),
  overall_rating: z.number().nullable().optional(),
  annotation_count: z.number(),
  completed_at: z.string().nullable().optional(),
})

const ReviewsListSchema = z.array(ReviewSchema)

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

function calculateAverageRating(reviews: Array<{ overall_rating?: number | null | undefined }>): string {
  const ratings = reviews.filter((r) => r.overall_rating != null).map((r) => r.overall_rating as number)
  if (ratings.length === 0) return "—"
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length
  return `${avg.toFixed(1)} / 5`
}

function calculateBudgetRange(plans: Array<{ estimated_budget_min?: number | string | null | undefined; estimated_budget_max?: number | string | null | undefined }>): { min: number; max: number } {
  let min = Infinity
  let max = 0

  for (const plan of plans) {
    const minVal = typeof plan.estimated_budget_min === "string" ? parseFloat(plan.estimated_budget_min) : plan.estimated_budget_min
    const maxVal = typeof plan.estimated_budget_max === "string" ? parseFloat(plan.estimated_budget_max) : plan.estimated_budget_max

    if (minVal != null && !isNaN(minVal) && minVal < min) min = minVal
    if (maxVal != null && !isNaN(maxVal) && maxVal > max) max = maxVal
  }

  return { min: min === Infinity ? 0 : min, max }
}

function calculateDurationRange(plans: Array<{ estimated_duration_weeks_min?: number | null | undefined; estimated_duration_weeks_max?: number | null | undefined }>): { min: number; max: number } {
  let min = Infinity
  let max = 0

  for (const plan of plans) {
    if (plan.estimated_duration_weeks_min != null && plan.estimated_duration_weeks_min < min) {
      min = plan.estimated_duration_weeks_min
    }
    if (plan.estimated_duration_weeks_max != null && plan.estimated_duration_weeks_max > max) {
      max = plan.estimated_duration_weeks_max
    }
  }

  return { min: min === Infinity ? 0 : min, max }
}

function countByDomain(projects: Array<{ domain?: string | null }>): Array<{ domain: string; count: number }> {
  const counts: Record<string, number> = {}
  for (const project of projects) {
    const domain = project.domain || "Other"
    counts[domain] = (counts[domain] || 0) + 1
  }
  return Object.entries(counts)
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}

export function AnalyticsPage() {
  const projectsQuery = useQuery({
    queryKey: ["projects-analytics"],
    queryFn: () => apiFetch("/api/projects/", ProjectsListSchema),
  })

  const plansQuery = useQuery({
    queryKey: ["plans-analytics"],
    queryFn: () => apiFetch("/api/plans/", PlansListSchema),
  })

  const reviewsQuery = useQuery({
    queryKey: ["reviews-analytics"],
    queryFn: () => apiFetch("/api/reviews/", ReviewsListSchema),
  })

  const projects = projectsQuery.data ?? []
  const plans = plansQuery.data ?? []
  const reviews = reviewsQuery.data ?? []

  const completedPlans = plans.filter((p) => p.status === "completed")
  const completedReviews = reviews.filter((r) => r.status === "completed")
  const inProgressReviews = reviews.filter((r) => r.status === "in_progress")

  const budgetRange = calculateBudgetRange(completedPlans)
  const durationRange = calculateDurationRange(completedPlans)
  const domainStats = countByDomain(projects)

  const isLoading = projectsQuery.isLoading || plansQuery.isLoading || reviewsQuery.isLoading
  const hasError = projectsQuery.error || plansQuery.error || reviewsQuery.error

  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-semibold tracking-tight">Analytics</h2>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading analytics...</p>
      ) : null}

      {hasError ? (
        <p className="text-sm text-destructive">Failed to load analytics data.</p>
      ) : null}

      {!isLoading && !hasError ? (
        <>
          {/* Overview Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-2xl border-border/70">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FolderOpen className="h-4 w-4" />
                  Projects
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{projects.length}</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/70">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  Plans
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{plans.length}</p>
                <p className="text-xs text-muted-foreground">
                  {completedPlans.length} completed
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/70">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <CheckCircle className="h-4 w-4" />
                  Reviews
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{reviews.length}</p>
                <p className="text-xs text-muted-foreground">
                  {completedReviews.length} completed, {inProgressReviews.length} in progress
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/70">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <BarChart3 className="h-4 w-4" />
                  Avg. Rating
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{calculateAverageRating(completedReviews)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Stats */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-2xl border-border/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="h-5 w-5" />
                  Budget Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Budget Range</span>
                  <span className="font-medium">
                    {formatCurrency(budgetRange.min)} – {formatCurrency(budgetRange.max)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
                    style={{
                      width: budgetRange.max > 0 ? `${Math.min((budgetRange.min / budgetRange.max) * 100, 100)}%` : "0%",
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-5 w-5" />
                  Timeline Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Duration Range</span>
                  <span className="font-medium">
                    {durationRange.min}–{durationRange.max} weeks
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
                    style={{
                      width: durationRange.max > 0 ? `${Math.min((durationRange.min / durationRange.max) * 100, 100)}%` : "0%",
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Domain Distribution */}
          <Card className="rounded-2xl border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Top Domains</CardTitle>
            </CardHeader>
            <CardContent>
              {domainStats.length > 0 ? (
                <div className="space-y-2">
                  {domainStats.map(({ domain, count }) => (
                    <div key={domain} className="flex items-center gap-3">
                      <span className="w-32 truncate text-sm">{domain}</span>
                      <div className="flex-1">
                        <div className="h-2 rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-500"
                            style={{
                              width: `${(count / projects.length) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                      <span className="w-12 text-right text-sm text-muted-foreground">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No domain data available.</p>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
