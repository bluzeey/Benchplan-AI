from django.urls import path

from .views import (
    CompleteReviewView,
    CreateReviewAnnotationView,
    CreateReviewSessionView,
    FeedbackExampleListView,
    ReviewSessionDetailView,
    ReviewSessionListView,
    UpdateReviewAnnotationView,
)

urlpatterns = [
    path("reviews/", ReviewSessionListView.as_view(), name="review-list"),
    path("plans/<uuid:plan_id>/reviews/", CreateReviewSessionView.as_view(), name="review-create"),
    path("reviews/<uuid:review_id>/", ReviewSessionDetailView.as_view(), name="review-detail"),
    path("reviews/<uuid:review_id>/annotations/", CreateReviewAnnotationView.as_view(), name="annotation-create"),
    path("reviews/<uuid:review_id>/annotations/<uuid:annotation_id>/", UpdateReviewAnnotationView.as_view(), name="annotation-update"),
    path("reviews/<uuid:review_id>/complete/", CompleteReviewView.as_view(), name="review-complete"),
    path("feedback/examples/", FeedbackExampleListView.as_view(), name="feedback-examples"),
]
