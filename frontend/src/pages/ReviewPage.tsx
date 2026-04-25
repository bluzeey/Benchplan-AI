import { useMutation } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { AnnotationComposer } from "@/components/scientist/AnnotationComposer"
import { ReviewPanel } from "@/components/scientist/ReviewPanel"
import { Button } from "@/components/ui/button"
import { apiFetch, apiFetchRaw } from "@/lib/api"
import { ReviewSessionSchema } from "@/lib/schemas"

export function ReviewPage() {
  const { planId } = useParams()
  const navigate = useNavigate()
  const [reviewId, setReviewId] = useState<string | null>(null)

  const createReview = useMutation({
    mutationFn: async () => {
      const payload = await apiFetchRaw(`/api/plans/${planId}/reviews/`, { method: "POST" })
      return ReviewSessionSchema.parse(payload)
    },
    onSuccess: (review) => setReviewId(review.id),
  })

  const reviewQuery = useMutation({
    mutationFn: async (id: string) => apiFetch(`/api/reviews/${id}/`, ReviewSessionSchema),
  })

  const addAnnotation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (!reviewId) throw new Error("Review not initialized")
      await apiFetchRaw(`/api/reviews/${reviewId}/annotations/`, {
        method: "POST",
        body: JSON.stringify(payload),
      })
      const updated = await apiFetch(`/api/reviews/${reviewId}/`, ReviewSessionSchema)
      reviewQuery.reset()
      reviewQuery.mutate(updated.id)
    },
  })

  const completeReview = useMutation({
    mutationFn: async () => {
      if (!reviewId) throw new Error("Review not initialized")
      const payload = await apiFetchRaw(`/api/reviews/${reviewId}/complete/`, {
        method: "POST",
        body: JSON.stringify({ overall_rating: 4 }),
      })
      return ReviewSessionSchema.parse(payload)
    },
    onSuccess: () => navigate(`/plans/${planId}`),
  })

  useEffect(() => {
    if (!reviewId && !createReview.isPending && !createReview.isSuccess) {
      createReview.mutate()
    }
  }, [createReview, reviewId])

  useEffect(() => {
    if (reviewId) {
      reviewQuery.mutate(reviewId)
    }
  }, [reviewId, reviewQuery])

  const review = createReview.data ?? reviewQuery.data

  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-semibold tracking-tight">Scientist review workspace</h2>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card/60 px-3 py-2 text-xs text-muted-foreground">
        <span className="font-mono">Plan: {planId ?? "n/a"}</span>
        <span className="font-mono">Review: {reviewId ?? "initializing"}</span>
      </div>
      {review ? <ReviewPanel review={review} /> : <p className="text-sm text-muted-foreground">Initializing review...</p>}
      <AnnotationComposer onSubmit={(payload) => addAnnotation.mutateAsync(payload)} />
      <Button onClick={() => completeReview.mutate()} disabled={completeReview.isPending || !reviewId}>
        {completeReview.isPending ? "Saving..." : "Complete review"}
      </Button>
      {createReview.error ? <p className="text-sm text-destructive">{(createReview.error as Error).message}</p> : null}
      {addAnnotation.error ? <p className="text-sm text-destructive">{(addAnnotation.error as Error).message}</p> : null}
    </div>
  )
}
