from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView, UpdateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.access import owned_plans, owned_reviews

from .models import FeedbackExample, ReviewSession
from .serializers import (
    FeedbackExampleSerializer,
    ReviewAnnotationSerializer,
    ReviewSessionListSerializer,
    ReviewSessionSerializer,
)
from .services import create_feedback_example_from_annotation


class ReviewSessionListView(ListAPIView):
    serializer_class = ReviewSessionListSerializer

    def get_queryset(self):
        return owned_reviews(self.request.user).select_related("plan", "plan__project").order_by("-created_at")


class CreateReviewSessionView(APIView):
    def post(self, request, plan_id):
        plan = get_object_or_404(owned_plans(request.user), pk=plan_id)
        review = ReviewSession.objects.create(plan=plan, reviewer=request.user)
        return Response(ReviewSessionSerializer(review).data, status=status.HTTP_201_CREATED)


class ReviewSessionDetailView(RetrieveAPIView):
    serializer_class = ReviewSessionSerializer
    lookup_url_kwarg = "review_id"

    def get_queryset(self):
        return owned_reviews(self.request.user)


class CreateReviewAnnotationView(APIView):
    def post(self, request, review_id):
        review = get_object_or_404(owned_reviews(request.user), pk=review_id)
        serializer = ReviewAnnotationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        annotation = serializer.save(review_session=review)
        create_feedback_example_from_annotation(annotation)
        return Response(ReviewAnnotationSerializer(annotation).data, status=status.HTTP_201_CREATED)


class UpdateReviewAnnotationView(UpdateAPIView):
    serializer_class = ReviewAnnotationSerializer
    lookup_url_kwarg = "annotation_id"

    def get_queryset(self):
        review = get_object_or_404(owned_reviews(self.request.user), pk=self.kwargs["review_id"])
        return review.annotations.all()


class CompleteReviewView(APIView):
    def post(self, request, review_id):
        review = get_object_or_404(owned_reviews(request.user), pk=review_id)
        review.status = "completed"
        review.completed_at = timezone.now()
        if "overall_rating" in request.data:
            review.overall_rating = request.data["overall_rating"]
        review.save(update_fields=["status", "completed_at", "overall_rating", "updated_at"])
        return Response(ReviewSessionSerializer(review).data)


class FeedbackExampleListView(ListAPIView):
    serializer_class = FeedbackExampleSerializer

    def get_queryset(self):
        return FeedbackExample.objects.filter(
            source_annotation__review_session__in=owned_reviews(self.request.user),
            approved_for_reuse=True,
        ).order_by("-created_at")
