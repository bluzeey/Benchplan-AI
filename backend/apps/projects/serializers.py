from rest_framework import serializers

from .models import ExperimentQuestion, Project, ProjectAttachment


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


class ProjectAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectAttachment
        fields = ["id", "name", "url", "content_type", "size", "created_at"]
        read_only_fields = ["id", "created_at"]


class ProjectSerializer(serializers.ModelSerializer):
    questions = ExperimentQuestionSerializer(many=True, read_only=True)
    attachments = ProjectAttachmentSerializer(many=True, read_only=True)
    owner_name = serializers.CharField(source="owner.full_name", read_only=True)

    class Meta:
        model = Project
        fields = ["id", "title", "domain", "owner", "owner_name", "questions", "attachments", "created_at", "updated_at"]
        read_only_fields = ["id", "owner", "owner_name", "questions", "attachments", "created_at", "updated_at"]


class ProjectCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    hypothesis = serializers.CharField(min_length=40)
    domain = serializers.CharField(required=False, allow_blank=True)
    currency = serializers.CharField(required=False, allow_blank=True)
    target_duration_weeks = serializers.IntegerField(required=False)
    lab_type = serializers.CharField(required=False, allow_blank=True)
    attachments = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list,
    )

    def create(self, validated_data):
        attachments_data = validated_data.pop("attachments", [])
        
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
        
        # Create attachment records for uploaded files
        for att in attachments_data:
            if isinstance(att, dict) and att.get("url"):
                ProjectAttachment.objects.create(
                    project=project,
                    name=att.get("name", "unnamed"),
                    object_key=att.get("object_key", ""),
                    url=att.get("url"),
                    content_type=att.get("type", "application/octet-stream"),
                    size=att.get("size", 0),
                )
        
        return project

    def to_representation(self, instance):
        return ProjectSerializer(instance).data
