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
    title = serializers.CharField(max_length=255, required=False, allow_blank=True)
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

    def _generate_project_title(self, hypothesis: str) -> str:
        """Generate a concise project title from the hypothesis."""
        try:
            from apps.agents.llm_gateway import llm_gateway

            prompt = """Generate a concise project title (2-6 words) based on this research hypothesis.
Rules:
- Be specific about the research topic
- Include key variables (organism/intervention/outcome)
- Professional scientific tone
- Return ONLY the title, nothing else"""

            title = llm_gateway.generate_text(
                prompt=prompt,
                payload={"hypothesis": hypothesis},
                system_message="You generate professional scientific project titles.",
                temperature=0.3,
            )
            title = title.strip().strip('"').strip("'")
            if len(title) > 3:
                return title
        except Exception:
            pass

        # Fallback: extract key terms
        import re
        words = hypothesis.split()
        key_terms = []
        skip_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
                      "will", "is", "are", "be", "been", "being", "have", "has", "had", "do", "does", "did",
                      "can", "could", "may", "might", "must", "shall", "should", "would", "compared", "versus",
                      "at", "least", "more", "less", "than", "using", "under", "after", "during", "that", "this"}

        for word in words[:20]:
            clean = re.sub(r'[^\w\s-]', '', word).lower()
            if clean and clean not in skip_words and len(clean) > 2:
                key_terms.append(word)
            if len(key_terms) >= 4:
                break

        if key_terms:
            return " ".join(key_terms[:5])

        return hypothesis[:50].strip()

    def create(self, validated_data):
        attachments_data = validated_data.pop("attachments", [])
        hypothesis = validated_data["hypothesis"]

        # Generate title if not provided
        title = validated_data.get("title", "").strip()
        if not title:
            title = self._generate_project_title(hypothesis)

        project = Project.objects.create(
            title=title,
            domain=validated_data.get("domain", ""),
            owner=self.context.get("request").user if self.context.get("request") and self.context.get("request").user.is_authenticated else None,
        )
        ExperimentQuestion.objects.create(
            project=project,
            raw_text=hypothesis,
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
