import { useQuery } from "@tanstack/react-query"
import { z } from "zod"
import { motion } from "framer-motion"
import {
  FolderOpen,
  FileText,
  CheckCircle,
  BarChart3,
  Clock,
  DollarSign,
  TrendingUp,
  PieChart,
  Activity,
  Calendar,
  Award,
  Sparkles
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/ui/empty-state"
import { 
  ProjectsListSchema,
  PlansListSchema,
  ReviewsListSchema,
} from "@/lib/schemas"
import { queryKeys } from "@/lib/query-keys"
import { 
  fadeInUp, 
  staggerContainer, 
  staggerItem,
  scaleIn
} from "@/lib/motion"

// Recharts imports
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  CartesianGrid,
  AreaChart,
  Area,
  LineChart,
  Line,
  Legend
} from "recharts"

// Color palette for charts
const COLORS = {
  cyan: "#22d3ee",
  purple: "#a855f7",
  emerald: "#34d399",
  amber: "#fbbf24",
  rose: "#f43f5e",
  blue: "#3b82f6",
  indigo: "#6366f1",
  pink: "#ec4899",
  orange: "#f97316",
  teal: "#14b8a6",
}

const CHART_COLORS = [
  COLORS.cyan,
  COLORS.purple,
  COLORS.emerald,
  COLORS.amber,
  COLORS.rose,
  COLORS.blue,
  COLORS.indigo,
  COLORS.pink,
]

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

function countByDomain(projects: Array<{ domain?: string | null }>): Array<{ domain: string; count: number; color: string }> {
  const counts: Record<string, number> = {}
  for (const project of projects) {
    const domain = project.domain || "Other"
    counts[domain] = (counts[domain] || 0) + 1
  }
  return Object.entries(counts)
    .map(([domain, count], index) => ({ 
      domain, 
      count,
      color: CHART_COLORS[index % CHART_COLORS.length]
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}

// Stat card with animation
function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  gradient,
  delay = 0,
}: {
  icon: typeof FolderOpen
  label: string
  value: string | number
  sublabel: string
  gradient: string
  delay?: number
}) {
  return (
    <motion.div
      variants={fadeInUp}
      transition={{ delay }}
      whileHover={{ y: -4, scale: 1.02 }}
      className={cn(
        "rounded-xl border border-border/60 bg-gradient-to-br p-4 transition-all duration-300",
        "hover:shadow-lg",
        gradient
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl",
          "bg-white/10 backdrop-blur-sm"
        )}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-xs text-white/70 font-medium uppercase tracking-wider">{label}</p>
          <motion.p
            className="text-2xl font-display font-bold text-white"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay + 0.1, type: "spring", stiffness: 200 }}
          >
            {value}
          </motion.p>
          <p className="text-xs text-white/60">{sublabel}</p>
        </div>
      </div>
    </motion.div>
  )
}

// Custom tooltip for charts
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border/80 bg-card/95 backdrop-blur-xl px-3 py-2 shadow-xl">
        <p className="text-sm font-medium text-foreground">{label || payload[0].name}</p>
        <p className="text-sm text-cyan-400">
          {payload[0].value}
        </p>
      </div>
    )
  }
  return null
}

export function AnalyticsPage() {
  // Use shared cache keys so data is already available when navigating from other pages
  const projectsQuery = useQuery({
    queryKey: queryKeys.projects.list,
    queryFn: () => apiFetch("/api/projects/", ProjectsListSchema),
    staleTime: 60_000,
  })

  const plansQuery = useQuery({
    queryKey: queryKeys.plans.list,
    queryFn: () => apiFetch("/api/plans/", PlansListSchema),
    staleTime: 60_000,
  })

  const reviewsQuery = useQuery({
    queryKey: queryKeys.reviews.list,
    queryFn: () => apiFetch("/api/reviews/", ReviewsListSchema),
    staleTime: 60_000,
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

  // Plan status data for pie chart
  const planStatusData = [
    { name: "Completed", value: plans.filter((p) => p.status === "completed").length, color: COLORS.emerald },
    { name: "Generating", value: plans.filter((p) => p.status === "generating").length, color: COLORS.blue },
    { name: "Draft", value: plans.filter((p) => p.status === "draft").length, color: COLORS.amber },
    { name: "Error", value: plans.filter((p) => p.status === "error").length, color: COLORS.rose },
  ].filter((d) => d.value > 0)

  // Budget distribution data
  const budgetData = completedPlans
    .filter((p) => p.estimated_budget_max)
    .map((p, i) => ({
      name: p.title.length > 20 ? p.title.slice(0, 20) + "..." : p.title,
      budget: typeof p.estimated_budget_max === "string" 
        ? parseFloat(p.estimated_budget_max) 
        : p.estimated_budget_max || 0,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }))
    .slice(0, 8)

  // Timeline data
  const timelineData = completedPlans
    .filter((p) => p.estimated_duration_weeks_max)
    .map((p, i) => ({
      name: p.title.length > 15 ? p.title.slice(0, 15) + "..." : p.title,
      duration: p.estimated_duration_weeks_max || 0,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }))
    .slice(0, 8)

  if (isLoading) {
    return (
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20">
            <BarChart3 className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-semibold tracking-tight text-foreground">
              Analytics
            </h2>
            <p className="text-sm text-muted-foreground">
              Loading analytics data...
            </p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        variants={fadeInUp}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20">
            <BarChart3 className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-semibold tracking-tight text-foreground">
              Analytics
            </h2>
            <p className="text-sm text-muted-foreground">
              Insights and metrics for your research
            </p>
          </div>
        </div>
        <Badge
          variant="default"
          className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 border-cyan-500/30"
        >
          <Sparkles className="h-3 w-3 mr-1" />
          Real-time
        </Badge>
      </motion.div>

      {hasError && (
        <motion.div
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400"
          variants={scaleIn}
        >
          Failed to load analytics data. Please try again.
        </motion.div>
      )}

      {!isLoading && !hasError && projects.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <EmptyState
            type="chart"
            title="No data yet"
            description="Start creating projects to see analytics and insights about your research."
            actionLabel="Create Project"
            actionIcon={<Sparkles className="h-4 w-4" />}
            onAction={() => window.location.href = "/projects/new"}
          />
        </motion.div>
      )}

      {!isLoading && !hasError && projects.length > 0 && (
        <>
          {/* Overview Stats */}
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <StatCard
              icon={FolderOpen}
              label="Total Projects"
              value={projects.length}
              sublabel="Across all domains"
              gradient="from-blue-500/80 to-blue-600/80"
              delay={0}
            />
            <StatCard
              icon={FileText}
              label="Total Plans"
              value={plans.length}
              sublabel={`${completedPlans.length} completed`}
              gradient="from-emerald-500/80 to-emerald-600/80"
              delay={0.05}
            />
            <StatCard
              icon={CheckCircle}
              label="Reviews"
              value={reviews.length}
              sublabel={`${completedReviews.length} completed`}
              gradient="from-purple-500/80 to-purple-600/80"
              delay={0.1}
            />
            <StatCard
              icon={Award}
              label="Avg. Rating"
              value={calculateAverageRating(completedReviews)}
              sublabel="From completed reviews"
              gradient="from-amber-500/80 to-orange-500/80"
              delay={0.15}
            />
          </motion.div>

          {/* Charts Grid */}
          <motion.div
            className="grid gap-4 lg:grid-cols-2"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {/* Domain Distribution - Pie Chart */}
            <motion.div variants={fadeInUp}>
              <Card className="rounded-2xl border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <PieChart className="h-5 w-5 text-cyan-400" />
                    Domain Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {domainStats.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie
                            data={domainStats}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="count"
                            nameKey="domain"
                          >
                            {domainStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <ReTooltip content={<CustomTooltip />} />
                          <Legend />
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No domain data available.
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Plan Status - Pie Chart */}
            <motion.div variants={fadeInUp}>
              <Card className="rounded-2xl border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="h-5 w-5 text-emerald-400" />
                    Plan Status Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {planStatusData.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie
                            data={planStatusData}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="value"
                            nameKey="name"
                            label
                          >
                            {planStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <ReTooltip content={<CustomTooltip />} />
                          <Legend />
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No plan status data available.
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Budget Distribution - Bar Chart */}
            <motion.div variants={fadeInUp}>
              <Card className="rounded-2xl border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <DollarSign className="h-5 w-5 text-emerald-400" />
                    Budget Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {budgetData.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={budgetData} margin={{ left: 0, right: 0, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis 
                            dataKey="name" 
                            stroke="rgba(255,255,255,0.3)" 
                            fontSize={10}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis 
                            stroke="rgba(255,255,255,0.3)" 
                            fontSize={10}
                            tickFormatter={(value) => `$${value / 1000}k`}
                          />
                          <ReTooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="rounded-lg border border-border/80 bg-card/95 backdrop-blur-xl px-3 py-2 shadow-xl">
                                    <p className="text-sm font-medium text-foreground">{payload[0].payload.name}</p>
                                    <p className="text-sm text-emerald-400">
                                      {formatCurrency(payload[0].value as number)}
                                    </p>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Bar dataKey="budget" radius={[4, 4, 0, 0]}>
                            {budgetData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No budget data available.
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Timeline Distribution - Bar Chart */}
            <motion.div variants={fadeInUp}>
              <Card className="rounded-2xl border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="h-5 w-5 text-blue-400" />
                    Timeline Distribution (Weeks)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {timelineData.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={timelineData} margin={{ left: 0, right: 0, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis 
                            dataKey="name" 
                            stroke="rgba(255,255,255,0.3)" 
                            fontSize={10}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis 
                            stroke="rgba(255,255,255,0.3)" 
                            fontSize={10}
                          />
                          <ReTooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="rounded-lg border border-border/80 bg-card/95 backdrop-blur-xl px-3 py-2 shadow-xl">
                                    <p className="text-sm font-medium text-foreground">{payload[0].payload.name}</p>
                                    <p className="text-sm text-blue-400">
                                      {payload[0].value} weeks
                                    </p>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Bar dataKey="duration" radius={[4, 4, 0, 0]}>
                            {timelineData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No timeline data available.
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Budget Range Overview */}
            <motion.div variants={fadeInUp} className="lg:col-span-2">
              <Card className="rounded-2xl border-border/60 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-5 w-5 text-cyan-400" />
                    Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Budget Range */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Budget Range</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(budgetRange.min)} – {formatCurrency(budgetRange.max)}
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-purple-500"
                        initial={{ width: 0 }}
                        animate={{ 
                          width: budgetRange.max > 0 
                            ? `${Math.min((budgetRange.min / budgetRange.max) * 100, 100)}%` 
                            : "0%" 
                        }}
                        transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
                      />
                    </div>
                  </div>

                  {/* Duration Range */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Duration Range</span>
                      <span className="font-medium text-foreground">
                        {durationRange.min}–{durationRange.max} weeks
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500"
                        initial={{ width: 0 }}
                        animate={{ 
                          width: durationRange.max > 0 
                            ? `${Math.min((durationRange.min / durationRange.max) * 100, 100)}%` 
                            : "0%" 
                        }}
                        transition={{ duration: 1, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
                      />
                    </div>
                  </div>

                  {/* Review Summary */}
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
                    <div className="text-center">
                      <p className="text-2xl font-display font-bold text-emerald-400">
                        {completedReviews.length}
                      </p>
                      <p className="text-xs text-muted-foreground">Completed Reviews</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-display font-bold text-blue-400">
                        {inProgressReviews.length}
                      </p>
                      <p className="text-xs text-muted-foreground">In Progress</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-display font-bold text-cyan-400">
                        {reviews.reduce((sum, r) => sum + (r.annotation_count || 0), 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Total Annotations</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </>
      )}
    </motion.div>
  )
}
