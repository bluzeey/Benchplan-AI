from django.utils import timezone
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.agents.models import AgentEvent, AgentRun
from apps.projects.models import ExperimentQuestion

from .models import LiteratureQcRun, Reference
from .serializers import LiteratureQcRunSerializer, ReferenceSerializer


class LiteratureQcCreateView(APIView):
    def post(self, request, question_id):
        question = ExperimentQuestion.objects.get(id=question_id)
        qc_run = LiteratureQcRun.objects.create(question=question, status="running", started_at=timezone.now())
        agent_run = AgentRun.objects.create(
            run_type="literature_qc",
            status="running",
            input_payload={"question_id": str(question_id), "qc_run_id": str(qc_run.id)},
        )
        AgentEvent.objects.create(run=agent_run, label="Input received", payload={})
        from apps.agents.tasks import run_literature_qc_task

        run_literature_qc_task.delay(str(qc_run.id), str(agent_run.id))
        return Response({"qc_run_id": str(qc_run.id), "agent_run_id": str(agent_run.id)}, status=status.HTTP_202_ACCEPTED)


class LiteratureQcDetailView(RetrieveAPIView):
    queryset = LiteratureQcRun.objects.all()
    serializer_class = LiteratureQcRunSerializer
    lookup_url_kwarg = "qc_run_id"


class LiteratureReferencesView(ListAPIView):
    serializer_class = ReferenceSerializer

    def get_queryset(self):
        return Reference.objects.filter(qc_run_id=self.kwargs["qc_run_id"]).order_by("-relevance_score")


class LiteratureQcRetryView(APIView):
    def post(self, request, qc_run_id):
        qc_run = LiteratureQcRun.objects.get(id=qc_run_id)
        qc_run.status = "running"
        qc_run.started_at = timezone.now()
        qc_run.save(update_fields=["status", "started_at", "updated_at"])
        agent_run = AgentRun.objects.create(
            run_type="literature_qc",
            status="running",
            input_payload={"question_id": str(qc_run.question_id), "qc_run_id": str(qc_run.id), "retry": True},
        )
        AgentEvent.objects.create(run=agent_run, label="Input received", payload={"retry": True})
        from apps.agents.tasks import run_literature_qc_task

        run_literature_qc_task.delay(str(qc_run.id), str(agent_run.id))
        return Response({"qc_run_id": str(qc_run.id), "agent_run_id": str(agent_run.id)}, status=status.HTTP_202_ACCEPTED)
