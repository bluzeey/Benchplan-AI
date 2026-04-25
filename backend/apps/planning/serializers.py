from rest_framework import serializers

from .models import BudgetLine, ExperimentPlan, Material, PlanSection, ProtocolStep, TimelinePhase


class PlanSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanSection
        fields = ["id", "key", "title", "order", "content_markdown", "content_json", "confidence", "needs_review"]


class ProtocolStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProtocolStep
        fields = [
            "id",
            "step_number",
            "title",
            "description",
            "duration_minutes",
            "critical_parameters",
            "equipment",
            "expected_output",
            "citations",
            "safety_notes",
            "confidence",
        ]


class MaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Material
        fields = "__all__"


class BudgetLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetLine
        fields = "__all__"


class TimelinePhaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimelinePhase
        fields = "__all__"


class ExperimentPlanListSerializer(serializers.ModelSerializer):
    project_title = serializers.CharField(source="project.title", read_only=True)
    question_text = serializers.CharField(source="question.raw_text", read_only=True)

    class Meta:
        model = ExperimentPlan
        fields = [
            "id",
            "project",
            "project_title",
            "question",
            "question_text",
            "title",
            "status",
            "executive_summary",
            "estimated_budget_min",
            "estimated_budget_max",
            "estimated_duration_weeks_min",
            "estimated_duration_weeks_max",
            "scientist_review_status",
            "created_at",
            "updated_at",
        ]


class ExperimentPlanSerializer(serializers.ModelSerializer):
    sections = PlanSectionSerializer(many=True, read_only=True)
    protocol_steps = ProtocolStepSerializer(many=True, read_only=True)

    class Meta:
        model = ExperimentPlan
        fields = [
            "id",
            "project",
            "question",
            "qc_run",
            "title",
            "status",
            "version",
            "executive_summary",
            "plan_json",
            "estimated_budget_min",
            "estimated_budget_max",
            "estimated_duration_weeks_min",
            "estimated_duration_weeks_max",
            "scientist_review_status",
            "sections",
            "protocol_steps",
            "created_at",
            "updated_at",
        ]
