from django.urls import path

from .views import AgentRunDetailView, AgentRunEventsView

urlpatterns = [
    path("agent-runs/<uuid:run_id>/", AgentRunDetailView.as_view(), name="agent-run-detail"),
    path("agent-runs/<uuid:run_id>/events/", AgentRunEventsView.as_view(), name="agent-run-events"),
]
