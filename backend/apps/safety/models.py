from django.db import models

from apps.common.models import UUIDModel


class SafetyAssessment(UUIDModel):
    question = models.ForeignKey("projects.ExperimentQuestion", related_name="safety_assessments", on_delete=models.CASCADE)
    state = models.CharField(max_length=64, default="clear_for_planning")
    categories = models.JSONField(default=list)
    required_approvals = models.JSONField(default=list)
    missing_information = models.JSONField(default=list)
    warning = models.TextField(blank=True)
