from django.db import models

from apps.common.models import UUIDModel


class AgentRun(UUIDModel):
    run_type = models.CharField(max_length=64)
    status = models.CharField(max_length=32, default="queued")
    input_payload = models.JSONField(default=dict)
    output_payload = models.JSONField(default=dict)
    error_message = models.TextField(blank=True)


class AgentEvent(UUIDModel):
    run = models.ForeignKey(AgentRun, related_name="events", on_delete=models.CASCADE)
    label = models.CharField(max_length=128)
    payload = models.JSONField(default=dict)
