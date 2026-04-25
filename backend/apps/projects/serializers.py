from rest_framework import serializers

from .models import ExperimentQuestion, Project


class ExperimentQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExperimentQuestion
        fields = [
            "id",
            "project",
            "raw_text",
            "parsed_json",
            "domain",
            "organism",
            "intervention",
            "outcome",
            "comparator",
            "mechanism",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "parsed_json", "created_at", "updated_at"]


class ProjectSerializer(serializers.ModelSerializer):
    questions = ExperimentQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = ["id", "title", "domain", "owner", "questions", "created_at", "updated_at"]
        read_only_fields = ["id", "owner", "questions", "created_at", "updated_at"]


class ProjectCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    hypothesis = serializers.CharField(min_length=40)
    domain = serializers.CharField(required=False, allow_blank=True)
    currency = serializers.CharField(required=False, allow_blank=True)
    target_duration_weeks = serializers.IntegerField(required=False)
    lab_type = serializers.CharField(required=False, allow_blank=True)

    def create(self, validated_data):
        project = Project.objects.create(
            title=validated_data["title"],
            domain=validated_data.get("domain", ""),
            owner=self.context.get("request").user if self.context.get("request") and self.context.get("request").user.is_authenticated else None,
        )
        ExperimentQuestion.objects.create(
            project=project,
            raw_text=validated_data["hypothesis"],
            domain=validated_data.get("domain", ""),
        )
        return project

    def to_representation(self, instance):
        return ProjectSerializer(instance).data
