import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { z } from "zod"
import { CheckCircle, MessageSquare, ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { apiFetch } from "@/lib/api"

const ReviewListItemSchema = z.object({
  id: z.union([z.string(), z.number()]).transform((val) => String(val)),
  plan: z.union([z.string(), z.number()]).transform((val) => String(val)),
  plan_title: z.string(),
  project_title: z.string(),
  status: z.string(),
  overall_rating: z.number().nullable().optional(),
  annotation_count: z.number(),
  created_at: z.string(),
  completed_at: z.string().nullable().optional(),
})

const ReviewsListSchema = z.array(ReviewListItemSchema)

const statusColors: Record<string, string> = {
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  pending: "bg-gray-500",
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

export function ReviewsPage() {
  const navigate = useNavigate()

  const reviewsQuery = useQuery({
    queryKey: ["reviews-list"],
    queryFn: () => apiFetch("/api/reviews/", ReviewsListSchema),
  })

  const reviews = reviewsQuery.data ?? []

  const inProgressReviews = reviews.filter((r) => r.status === "in_progress")
  const completedReviews = reviews.filter((r) => r.status === "completed")

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-semibold tracking-tight">Reviews</h2>
        <Button onClick={() => navigate("/plans")}>
          <CheckCircle className="mr-2 h-4 w-4" />
          Review a Plan
        </Button>
      </div>

      {reviewsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading reviews...</p>
      ) : null}

      {reviewsQuery.error ? (
        <p className="text-sm text-destructive">
          {(reviewsQuery.error as Error).message}
        </p>
      ) : null}

      {!reviewsQuery.isLoading && !reviewsQuery.error && reviews.length === 0 ? (
        <Card className="rounded-2xl border-border/70">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No reviews yet.</p>
            <Button
              variant="link"
              onClick={() => navigate("/plans")}
              className="mt-2"
            >
              Go to Plans to start a review
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {inProgressReviews.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-lg font-medium">In Progress</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inProgressReviews.map((review) => (
              <Card
                key={review.id}
                className="cursor-pointer rounded-2xl border-border/70 transition-colors hover:border-border"
                onClick={() => navigate(`/plans/${review.plan}/review`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-base">{review.plan_title}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {review.project_title} • {formatRelativeTime(review.created_at)}
                      </p>
                    </div>
                    <Badge
                      variant="default"
                      className={`${statusColors[review.status] ?? "bg-gray-500"} text-white`}
                    >
                      {review.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MessageSquare className="h-3 w-3" />
                    {review.annotation_count} annotation(s)
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {completedReviews.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Completed</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {completedReviews.map((review) => (
              <Card
                key={review.id}
                className="cursor-pointer rounded-2xl border-border/70 transition-colors hover:border-border"
                onClick={() => navigate(`/plans/${review.plan}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-base">{review.plan_title}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {review.project_title}
                        {review.completed_at ? ` • ${formatRelativeTime(review.completed_at)}` : null}
                      </p>
                    </div>
                    <Badge
                      variant="default"
                      className={`${statusColors[review.status] ?? "bg-gray-500"} text-white`}
                    >
                      {review.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-yellow-500">
                      {renderStars(review.overall_rating)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MessageSquare className="h-3 w-3" />
                      {review.annotation_count}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
