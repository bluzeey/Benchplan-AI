import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { CheckCircle, MessageSquare, ArrowRight, Sparkles, Star, Clock, FileSearch } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/ui/empty-state"
import { PlansGridSkeleton, PageHeaderSkeleton } from "@/components/ui/skeleton"
import { CollaborationIndicator } from "@/components/ui/collaboration-indicator"
import { ReviewsListSchema } from "@/lib/schemas"
import { queryKeys } from "@/lib/query-keys"
import { 
  fadeInUp, 
  staggerContainer, 
  staggerItem,
  scaleIn
} from "@/lib/motion"

const statusConfig: Record<string, { color: string; bgColor: string; label: string; icon: typeof CheckCircle }> = {
  in_progress: {
    color: "text-blue-400",
    bgColor: "bg-blue-500",
    label: "In Progress",
    icon: Clock,
  },
  completed: {
    color: "text-emerald-400",
    bgColor: "bg-emerald-500",
    label: "Completed",
    icon: CheckCircle,
  },
  pending: {
    color: "text-gray-400",
    bgColor: "bg-gray-500",
    label: "Pending",
    icon: Clock,
  },
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

function renderStars(rating: number | null | undefined): string {
  if (rating == null) return "Not rated"
  return "★".repeat(rating) + "☆".repeat(5 - rating)
}

// Review card component
function ReviewCard({
  review,
  isCompleted,
}: {
  review: {
    id: string
    plan: string
    plan_title: string
    project_title: string
    status: string
    overall_rating?: number | null
    annotation_count: number
    created_at: string
    completed_at?: string | null
  }
  isCompleted: boolean
}) {
  const navigate = useNavigate()
  const status = statusConfig[review.status] || statusConfig.pending
  const StatusIcon = status.icon

  return (
    <motion.div variants={staggerItem}>
      <Card
        className={cn(
          "cursor-pointer rounded-2xl border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden",
          "transition-all duration-300 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/10"
        )}
        onClick={() => navigate(isCompleted ? `/plans/${review.plan}` : `/plans/${review.plan}/review`)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-base font-display group-hover:text-cyan-400 transition-colors">
                {review.plan_title}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {review.project_title} • {formatRelativeTime(isCompleted && review.completed_at ? review.completed_at : review.created_at)}
              </p>
            </div>
            <Badge
              variant="default"
              className={cn("text-white shadow-md", status.bgColor)}
            >
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {isCompleted && review.overall_rating ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-lg text-amber-400">{renderStars(review.overall_rating)}</span>
                <span className="text-sm font-medium text-amber-400 ml-1">{review.overall_rating}/5</span>
              </div>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                {review.annotation_count} annotations
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {review.annotation_count} annotation{review.annotation_count !== 1 ? "s" : ""}
              </span>
              <motion.div
                className="text-cyan-400"
                whileHover={{ x: 4 }}
              >
                <ArrowRight className="h-4 w-4" />
              </motion.div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function ReviewsPage() {
  const navigate = useNavigate()

  const reviewsQuery = useQuery({
    queryKey: queryKeys.reviews.list,
    queryFn: () => apiFetch("/api/reviews/", ReviewsListSchema),
    staleTime: 30_000,
  })

  const reviews = reviewsQuery.data ?? []
  const isLoading = reviewsQuery.isLoading

  const inProgressReviews = reviews.filter((r) => r.status === "in_progress")
  const completedReviews = reviews.filter((r) => r.status === "completed")

  // Calculate stats
  const avgRating = completedReviews.length > 0
    ? (completedReviews.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / completedReviews.length).toFixed(1)
    : "—"

  const totalAnnotations = reviews.reduce((sum, r) => sum + (r.annotation_count || 0), 0)

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
            <MessageSquare className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-semibold tracking-tight text-foreground">
              Reviews
            </h2>
            <p className="text-sm text-muted-foreground">
              Review and annotate experiment plans
            </p>
          </div>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={() => navigate("/plans")}
            className="gap-2 bg-gradient-to-r from-cyan-500 to-purple-500 hover:opacity-90"
          >
            <FileSearch className="h-4 w-4" />
            Review a Plan
          </Button>
        </motion.div>
      </motion.div>

      {/* Collaboration Indicator */}
      <motion.div variants={fadeInUp}>
        <div className="flex items-center gap-4">
          <CollaborationIndicator type="ai" status="active" />
          <span className="text-sm text-muted-foreground">
            AI is ready to assist with reviews
          </span>
        </div>
      </motion.div>

      {/* Stats */}
      {!isLoading && reviews.length > 0 && (
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
          variants={fadeInUp}
        >
          {[
            { label: "Total Reviews", value: reviews.length, color: "cyan", icon: MessageSquare },
            { label: "In Progress", value: inProgressReviews.length, color: "blue", icon: Clock },
            { label: "Completed", value: completedReviews.length, color: "emerald", icon: CheckCircle },
            { label: "Avg. Rating", value: avgRating, color: "amber", icon: Star },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className={cn(
                "rounded-xl p-4 border border-border/60 bg-gradient-to-br transition-all duration-300",
                stat.color === "cyan" && "from-cyan-500/10 to-cyan-600/5 hover:from-cyan-500/20",
                stat.color === "blue" && "from-blue-500/10 to-blue-600/5 hover:from-blue-500/20",
                stat.color === "emerald" && "from-emerald-500/10 to-emerald-600/5 hover:from-emerald-500/20",
                stat.color === "amber" && "from-amber-500/10 to-amber-600/5 hover:from-amber-500/20",
              )}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
            >
              <div className="flex items-center gap-2">
                <stat.icon className={cn(
                  "h-4 w-4",
                  stat.color === "cyan" && "text-cyan-400",
                  stat.color === "blue" && "text-blue-400",
                  stat.color === "emerald" && "text-emerald-400",
                  stat.color === "amber" && "text-amber-400",
                )} />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className={cn(
                "text-2xl font-display font-bold mt-1",
                stat.color === "cyan" && "text-cyan-400",
                stat.color === "blue" && "text-blue-400",
                stat.color === "emerald" && "text-emerald-400",
                stat.color === "amber" && "text-amber-400",
              )}>
                {stat.value}
              </p>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Error State */}
      {reviewsQuery.error && (
        <motion.div
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400"
          variants={scaleIn}
        >
          {(reviewsQuery.error as Error).message}
        </motion.div>
      )}

      {/* Loading State */}
      {isLoading && <PlansGridSkeleton count={6} />}

      {/* Empty State */}
      {!isLoading && !reviewsQuery.error && reviews.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <EmptyState
            type="message"
            title="No reviews yet"
            description="Start reviewing experiment plans to provide scientific feedback and improve the quality of AI-generated plans."
            actionLabel="Start Reviewing"
            actionIcon={<Sparkles className="h-4 w-4" />}
            onAction={() => navigate("/plans")}
          />
        </motion.div>
      )}

      {/* Reviews Sections */}
      {!isLoading && reviews.length > 0 && (
        <motion.div className="space-y-6" variants={staggerContainer}>
          {/* In Progress Section */}
          {inProgressReviews.length > 0 && (
            <motion.div className="space-y-3" variants={fadeInUp}>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-display font-medium">In Progress</h3>
                <Badge variant="default" className="bg-blue-500 text-white">
                  {inProgressReviews.length}
                </Badge>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {inProgressReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} isCompleted={false} />
                ))}
              </div>
            </motion.div>
          )}

          {/* Completed Section */}
          {completedReviews.length > 0 && (
            <motion.div className="space-y-3" variants={fadeInUp}>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-display font-medium">Completed</h3>
                <Badge variant="default" className="bg-emerald-500 text-white">
                  {completedReviews.length}
                </Badge>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {completedReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} isCompleted={true} />
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
