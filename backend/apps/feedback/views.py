from django.utils import timezone
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView, UpdateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import FeedbackExample, ReviewAnnotation, ReviewSession
from .serializers import FeedbackExampleSerializer, ReviewAnnotationSerializer, ReviewSessionSerializer
from .services import create_feedback_example_from_annotation


class CreateReviewSessionView(APIView):
    def post(self, request, plan_id):
        review = ReviewSession.objects.create(plan_id=plan_id, reviewer=request.user if request.user.is_authenticated else None)
        return Response(ReviewSessionSerializer(review).data, status=status.HTTP_201_CREATED)


class ReviewSessionDetailView(RetrieveAPIView):
    queryset = ReviewSession.objects.all()
    serializer_class = ReviewSessionSerializer
    lookup_url_kwarg = "review_id"


class CreateReviewAnnotationView(APIView):
    def post(self, request, review_id):
        serializer = ReviewAnnotationSerializer(data={**request.data, "review_session": review_id})
        serializer.is_valid(raise_exception=True)
        annotation = serializer.save()
        create_feedback_example_from_annotation(annotation)
        return Response(ReviewAnnotationSerializer(annotation).data, status=status.HTTP_201_CREATED)


class UpdateReviewAnnotationView(UpdateAPIView):
    queryset = ReviewAnnotation.objects.all()
    serializer_class = ReviewAnnotationSerializer
    lookup_url_kwarg = "annotation_id"


class CompleteReviewView(APIView):
    def post(self, request, review_id):
        review = ReviewSession.objects.get(id=review_id)
        review.status = "completed"
        review.completed_at = timezone.now()
        if "overall_rating" in request.data:
            review.overall_rating = request.data["overall_rating"]
        review.save(update_fields=["status", "completed_at", "overall_rating", "updated_at"])
        return Response(ReviewSessionSerializer(review).data)


class FeedbackExampleListView(ListAPIView):
    serializer_class = FeedbackExampleSerializer

    def get_queryset(self):
        return FeedbackExample.objects.filter(approved_for_reuse=True).order_by("-created_at")
