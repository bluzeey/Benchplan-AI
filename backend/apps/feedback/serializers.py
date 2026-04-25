from rest_framework import serializers

from .models import FeedbackExample, ReviewAnnotation, ReviewSession


class ReviewAnnotationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReviewAnnotation
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class ReviewSessionSerializer(serializers.ModelSerializer):
    annotations = ReviewAnnotationSerializer(many=True, read_only=True)

    class Meta:
        model = ReviewSession
        fields = ["id", "plan", "reviewer", "status", "overall_rating", "annotations", "created_at", "completed_at"]
        read_only_fields = ["id", "reviewer", "created_at"]


class FeedbackExampleSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeedbackExample
        fields = "__all__"
