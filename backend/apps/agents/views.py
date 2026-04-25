from rest_framework.generics import ListAPIView, RetrieveAPIView

from .models import AgentEvent, AgentRun
from .serializers import AgentEventSerializer, AgentRunSerializer


class AgentRunDetailView(RetrieveAPIView):
    queryset = AgentRun.objects.all()
    serializer_class = AgentRunSerializer
    lookup_url_kwarg = "run_id"


class AgentRunEventsView(ListAPIView):
    serializer_class = AgentEventSerializer

    def get_queryset(self):
        return AgentEvent.objects.filter(run_id=self.kwargs["run_id"]).order_by("created_at")
