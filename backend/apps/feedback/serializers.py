from rest_framework import serializers

from .models import FeedbackExample, ReviewAnnotation, ReviewSession


class ReviewAnnotationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReviewAnnotation
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class ReviewSessionListSerializer(serializers.ModelSerializer):
    plan_title = serializers.CharField(source="plan.title", read_only=True)
    project_title = serializers.CharField(source="plan.project.title", read_only=True)
    annotation_count = serializers.IntegerField(source="annotations.count", read_only=True)

    class Meta:
        model = ReviewSession
        fields = [
            "id",
            "plan",
            "plan_title",
            "project_title",
            "status",
            "overall_rating",
            "annotation_count",
            "created_at",
            "completed_at",
        ]
        read_only_fields = ["id", "created_at"]


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
