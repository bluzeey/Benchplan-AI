import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { z } from "zod"
import { motion, AnimatePresence } from "framer-motion"
import { 
  FileText, 
  Clock, 
  DollarSign, 
  Loader2,
  FileSearch,
  Sparkles,
  TrendingUp,
  Calendar,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Clock3
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/ui/empty-state"
import { Tooltip } from "@/components/ui/tooltip"
import { PlansGridSkeleton, PageHeaderSkeleton } from "@/components/ui/skeleton"
import { PlansListSchema, type PlanListItem } from "@/lib/schemas"
import { queryKeys } from "@/lib/query-keys"
import { 
  fadeInUp, 
  staggerContainer, 
  staggerItem,
  scaleIn,
  hoverGlow,
  hoverLift
} from "@/lib/motion"

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle; label: string; gradient: string }> = {
  draft: { 
    color: "bg-gray-500", 
    icon: FileText, 
    label: "Draft",
    gradient: "from-gray-500/20 to-gray-600/10"
  },
  generating: { 
    color: "bg-blue-500", 
    icon: Loader2, 
    label: "Generating",
    gradient: "from-blue-500/20 to-cyan-500/10"
  },
  completed: { 
    color: "bg-green-500", 
    icon: CheckCircle, 
    label: "Completed",
    gradient: "from-emerald-500/20 to-green-500/10"
  },
  error: { 
    color: "bg-red-500", 
    icon: AlertCircle, 
    label: "Error",
    gradient: "from-red-500/20 to-rose-500/10"
  },
}

const reviewStatusConfig: Record<string, { color: string; label: string }> = {
  required: { color: "bg-amber-500", label: "Review Required" },
  in_progress: { color: "bg-blue-500", label: "In Progress" },
  completed: { color: "bg-green-500", label: "Completed" },
  pending: { color: "bg-gray-500", label: "Pending" },
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

// Budget visualization bar
function BudgetBar({
  min,
  max,
  className
}: {
  min: number | string | null | undefined
  max: number | string | null | undefined
  className?: string
}) {
  const minVal = min ? (typeof min === "string" ? parseFloat(min) : min) : 0
  const maxVal = max ? (typeof max === "string" ? parseFloat(max) : max) : minVal * 1.5 || 50000
  const percentage = maxVal > 0 ? Math.min((minVal / maxVal) * 100, 100) : 0

  return (
    <div className={cn("w-full", className)}>
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>Min</span>
        <span>Max</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-purple-500"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
        />
      </div>
      <div className="flex justify-between text-xs mt-1">
        <span className="text-emerald-400 font-medium">{formatCurrency(minVal)}</span>
        <span className="text-purple-400 font-medium">{formatCurrency(maxVal)}</span>
      </div>
    </div>
  )
}

// Duration visualization bar
function DurationBar({ 
  min, 
  max, 
  className 
}: { 
  min: number | null | undefined
  max: number | null | undefined
  className?: string 
}) {
  const minVal = min ?? 0
  const maxVal = max ?? Math.max(minVal * 1.5, 12)
  const percentage = maxVal > 0 ? Math.min((minVal / maxVal) * 100, 100) : 0

  return (
    <div className={cn("w-full", className)}>
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>Start</span>
        <span>End</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
        />
      </div>
      <div className="flex justify-between text-xs mt-1">
        <span className="text-blue-400 font-medium">{minVal}w</span>
        <span className="text-indigo-400 font-medium">{maxVal}w</span>
      </div>
    </div>
  )
}

// Animated Plan Card
function PlanCard({
  plan,
  index
}: {
  plan: {
    id: string
    title: string
    status: string
    project: string | number
    project_title: string
    question_text?: string
    executive_summary?: string
    estimated_budget_min?: number | string | null
    estimated_budget_max?: number | string | null
    estimated_duration_weeks_min?: number | null
    estimated_duration_weeks_max?: number | null
    scientist_review_status: string
    created_at: string
    updated_at: string
  }
  index: number
}) {
  const navigate = useNavigate()
  const status = statusConfig[plan.status] || statusConfig.draft
  const StatusIcon = status.icon
  const reviewStatus = reviewStatusConfig[plan.scientist_review_status]

  return (
    <motion.div
      variants={staggerItem}
      layout
      whileHover={{ 
        y: -4, 
        transition: { duration: 0.2 } 
      }}
      className="group"
    >
      <Card
        className={cn(
          "cursor-pointer rounded-2xl border-border/60 bg-gradient-to-br overflow-hidden transition-all duration-300",
          "hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/10",
          status.gradient
        )}
        onClick={() => navigate(`/plans/${plan.id}`)}
      >
        {/* Card glow effect */}
        <div className={cn(
          "absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none",
          "group-hover:opacity-100 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-emerald-500/5"
        )} />

        <CardHeader className="pb-3 relative">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-base font-display group-hover:text-cyan-400 transition-colors">
                {plan.title}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {plan.project_title} • {formatRelativeTime(plan.updated_at)}
              </p>
            </div>
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Badge
                variant="default"
                className={cn(
                  "flex items-center gap-1 text-white shadow-lg",
                  status.color
                )}
              >
                {plan.status === "generating" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <StatusIcon className="h-3 w-3" />
                )}
                {status.label}
              </Badge>
            </motion.div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-0 relative">
          {/* Status badges */}
          <div className="flex flex-wrap gap-2">
            {plan.status === "completed" && reviewStatus && (
              <Badge
                variant="default"
                className={cn(
                  "text-white shadow-md",
                  reviewStatus.color
                )}
              >
                {reviewStatus.label}
              </Badge>
            )}
          </div>

          {/* Description */}
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {plan.executive_summary || plan.question_text || "No description available"}
          </p>

          {/* Visualizations */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <BudgetBar 
                min={plan.estimated_budget_min} 
                max={plan.estimated_budget_max}
              />
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-blue-400 flex-shrink-0" />
              <DurationBar 
                min={plan.estimated_duration_weeks_min} 
                max={plan.estimated_duration_weeks_max}
              />
            </div>
          </div>

          {/* Footer stats */}
          <div className="flex items-center justify-between pt-2 border-t border-border/30">
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
            <motion.div
              className="text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity"
              initial={{ x: -10 }}
              whileHover={{ x: 0 }}
            >
              <ArrowRight className="h-4 w-4" />
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Stats summary card
function PlanStatsCard({ 
  plans, 
  isLoading 
}: { 
  plans: z.infer<typeof PlansListSchema>
  isLoading: boolean 
}) {
  const generating = plans.filter((p) => p.status === "generating").length
  const completed = plans.filter((p) => p.status === "completed").length
  const draft = plans.filter((p) => p.status === "draft").length
  const needsReview = plans.filter((p) => p.scientist_review_status === "required" && p.status === "completed").length

  const stats = [
    { label: "Active", value: generating, color: "blue", icon: Loader2 },
    { label: "Completed", value: completed, color: "emerald", icon: CheckCircle },
    { label: "Drafts", value: draft, color: "gray", icon: FileText },
    { label: "Needs Review", value: needsReview, color: "amber", icon: Clock3 },
  ]

  return (
    <motion.div
      variants={fadeInUp}
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
    >
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          className={cn(
            "rounded-xl p-4 border border-border/60 bg-gradient-to-br transition-all duration-300",
            stat.color === "blue" && "from-blue-500/10 to-cyan-500/5 hover:from-blue-500/20",
            stat.color === "emerald" && "from-emerald-500/10 to-green-500/5 hover:from-emerald-500/20",
            stat.color === "gray" && "from-gray-500/10 to-slate-500/5 hover:from-gray-500/20",
            stat.color === "amber" && "from-amber-500/10 to-yellow-500/5 hover:from-amber-500/20",
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          whileHover={{ scale: 1.02, y: -2 }}
        >
          <div className="flex items-center gap-2">
            <stat.icon className={cn(
              "h-4 w-4",
              stat.color === "blue" && "text-blue-400",
              stat.color === "emerald" && "text-emerald-400",
              stat.color === "gray" && "text-gray-400",
              stat.color === "amber" && "text-amber-400",
            )} />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</span>
          </div>
          <p className={cn(
            "text-2xl font-display font-bold mt-1",
            stat.color === "blue" && "text-blue-400",
            stat.color === "emerald" && "text-emerald-400",
            stat.color === "gray" && "text-gray-400",
            stat.color === "amber" && "text-amber-400",
          )}>
            {stat.value}
          </p>
        </motion.div>
      ))}
    </motion.div>
  )
}

export function PlansPage() {
  const navigate = useNavigate()

  const plansQuery = useQuery({
    queryKey: queryKeys.plans.list,
    queryFn: () => apiFetch("/api/plans/", PlansListSchema),
    staleTime: 30_000,
    refetchInterval: (query) => {
      const data = query.state.data
      if (data && data.some((p) => p.status === "generating")) {
        return 3000
      }
      return false
    },
  })

  const plans = plansQuery.data ?? []
  const isLoading = plansQuery.isLoading

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
            <FileText className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-semibold tracking-tight text-foreground">
              Plans
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage and review your experiment plans
            </p>
          </div>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={() => navigate("/dashboard")}
            className="gap-2 bg-gradient-to-r from-cyan-500 to-purple-500 hover:opacity-90"
          >
            <Sparkles className="h-4 w-4" />
            New Plan
          </Button>
        </motion.div>
      </motion.div>

      {/* Stats */}
      <PlanStatsCard plans={plans} isLoading={isLoading} />

      {/* Error State */}
      {plansQuery.error && (
        <motion.div
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400"
          variants={scaleIn}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {(plansQuery.error as Error).message}
          </div>
        </motion.div>
      )}

      {/* Loading State */}
      {isLoading && <PlansGridSkeleton count={6} />}

      {/* Empty State */}
      {!isLoading && !plansQuery.error && plans.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <EmptyState
            type="document"
            title="No plans yet"
            description="Create your first experiment plan by entering a hypothesis. Our AI will generate a comprehensive plan with budget, timeline, and materials."
            actionLabel="Create First Plan"
            actionIcon={<Sparkles className="h-4 w-4" />}
            onAction={() => navigate("/dashboard")}
          />
        </motion.div>
      )}

      {/* Plans Grid with Masonry-like Layout */}
      {!isLoading && plans.length > 0 && (
        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {plans.map((plan, index) => (
            <PlanCard key={plan.id} plan={plan} index={index} />
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}
