from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView, UpdateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.agents.models import AgentEvent, AgentRun
from apps.literature.models import LiteratureQcRun

from .models import BudgetLine, ExperimentPlan, Material, PlanSection, TimelinePhase
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
        if self.request.user.is_authenticated:
            return ExperimentPlan.objects.filter(
                project__owner=self.request.user
            ).select_related("project", "question").order_by("-created_at")
        return ExperimentPlan.objects.none()


class GeneratePlanView(APIView):
    def post(self, request, qc_run_id):
        qc_run = LiteratureQcRun.objects.get(id=qc_run_id)
        agent_run = AgentRun.objects.create(
            run_type="plan_generation",
            status="running",
            input_payload={"qc_run_id": str(qc_run.id), "question_id": str(qc_run.question_id)},
        )
        AgentEvent.objects.create(run=agent_run, label="Generating protocol", payload={})
        from apps.agents.tasks import generate_plan_task

        generate_plan_task.delay(str(qc_run.id), str(agent_run.id))
        return Response({"agent_run_id": str(agent_run.id)}, status=status.HTTP_202_ACCEPTED)


class PlanDetailView(RetrieveAPIView):
    queryset = ExperimentPlan.objects.all()
    serializer_class = ExperimentPlanSerializer
    lookup_url_kwarg = "plan_id"


class PlanSectionsView(ListAPIView):
    serializer_class = PlanSectionSerializer

    def get_queryset(self):
        return PlanSection.objects.filter(plan_id=self.kwargs["plan_id"]).order_by("order")


class PlanSectionPatchView(UpdateAPIView):
    serializer_class = PlanSectionSerializer
    queryset = PlanSection.objects.all()
    lookup_url_kwarg = "section_id"


class PlanMaterialsView(ListAPIView):
    serializer_class = MaterialSerializer

    def get_queryset(self):
        return Material.objects.filter(plan_id=self.kwargs["plan_id"]).order_by("name")


class PlanBudgetView(ListAPIView):
    serializer_class = BudgetLineSerializer

    def get_queryset(self):
        return BudgetLine.objects.filter(plan_id=self.kwargs["plan_id"]).order_by("category")


class PlanTimelineView(ListAPIView):
    serializer_class = TimelinePhaseSerializer

    def get_queryset(self):
        return TimelinePhase.objects.filter(plan_id=self.kwargs["plan_id"]).order_by("phase_number")
