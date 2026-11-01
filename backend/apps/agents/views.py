from rest_framework.generics import ListAPIView, RetrieveAPIView

from .serializers import AgentEventSerializer, AgentRunSerializer
from .access import owned_agent_run


class AgentRunDetailView(RetrieveAPIView):
    serializer_class = AgentRunSerializer
    lookup_url_kwarg = "run_id"

    def get_object(self):
        return owned_agent_run(self.request.user, self.kwargs["run_id"])


class AgentRunEventsView(ListAPIView):
    serializer_class = AgentEventSerializer

    def get_queryset(self):
        run = owned_agent_run(self.request.user, self.kwargs["run_id"])
        return run.events.order_by("created_at")
