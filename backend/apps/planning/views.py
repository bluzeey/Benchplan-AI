from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView, UpdateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.agents.models import AgentEvent, AgentRun
from apps.common.access import owned_plans, owned_qc_runs

from .models import ExperimentPlan
from .serializers import (
    BudgetLineSerializer,
    ExperimentPlanSerializer,
    ExperimentPlanListSerializer,
    MaterialSerializer,
    PlanSectionSerializer,
    TimelinePhaseSerializer,
)


class PlanListView(ListAPIView):
    serializer_class = ExperimentPlanListSerializer

    def get_queryset(self):
        return owned_plans(self.request.user).select_related("project", "question").order_by("-created_at")


class GeneratePlanView(APIView):
    def post(self, request, qc_run_id):
        qc_run = get_object_or_404(
            owned_qc_runs(request.user).select_related("question", "question__project"), pk=qc_run_id
        )
        question = qc_run.question
        project = question.project

        # Create placeholder plan with status "generating" so it appears immediately
        from apps.planning.services.plan_generator import build_plan_title
        placeholder_title = build_plan_title(question.raw_text)
        plan = ExperimentPlan.objects.create(
            project=project,
            question=question,
            qc_run=qc_run,
            title=placeholder_title,
            status="generating",
            executive_summary="Plan generation in progress...",
        )

        agent_run = AgentRun.objects.create(
            run_type="plan_generation",
            status="running",
            input_payload={
                "qc_run_id": str(qc_run.id),
                "question_id": str(qc_run.question_id),
                "plan_id": str(plan.id),
            },
        )
        AgentEvent.objects.create(run=agent_run, label="Generating protocol", payload={})
        from apps.agents.tasks import generate_plan_task

        generate_plan_task.delay(str(qc_run.id), str(agent_run.id), str(plan.id))
        return Response(
            {"agent_run_id": str(agent_run.id), "plan_id": str(plan.id)},
            status=status.HTTP_202_ACCEPTED
        )


class PlanDetailView(RetrieveAPIView):
    serializer_class = ExperimentPlanSerializer
    lookup_url_kwarg = "plan_id"

    def get_queryset(self):
        return owned_plans(self.request.user)


class OwnedPlanChildrenMixin:
    def get_plan(self):
        return get_object_or_404(owned_plans(self.request.user), pk=self.kwargs["plan_id"])


class PlanSectionsView(OwnedPlanChildrenMixin, ListAPIView):
    serializer_class = PlanSectionSerializer

    def get_queryset(self):
        return self.get_plan().sections.order_by("order")


class PlanSectionPatchView(OwnedPlanChildrenMixin, UpdateAPIView):
    serializer_class = PlanSectionSerializer
    lookup_url_kwarg = "section_id"

    def get_queryset(self):
        return self.get_plan().sections.all()


class PlanMaterialsView(OwnedPlanChildrenMixin, ListAPIView):
    serializer_class = MaterialSerializer

    def get_queryset(self):
        return self.get_plan().materials.order_by("name")


class PlanBudgetView(OwnedPlanChildrenMixin, ListAPIView):
    serializer_class = BudgetLineSerializer

    def get_queryset(self):
        return self.get_plan().budget_lines.order_by("category")


class PlanTimelineView(OwnedPlanChildrenMixin, ListAPIView):
    serializer_class = TimelinePhaseSerializer

    def get_queryset(self):
        return self.get_plan().timeline_phases.order_by("phase_number")
