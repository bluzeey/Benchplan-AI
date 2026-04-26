from django.contrib.auth import get_user_model
from django.db import models

from apps.common.models import UUIDModel

User = get_user_model()


class Project(UUIDModel):
    owner = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    title = models.CharField(max_length=255)
    domain = models.CharField(max_length=64, blank=True)

    def __str__(self) -> str:
        return self.title


class ExperimentQuestion(UUIDModel):
    project = models.ForeignKey(Project, related_name="questions", on_delete=models.CASCADE)
    raw_text = models.TextField()
    parsed_json = models.JSONField(default=dict)
    domain = models.CharField(max_length=64, blank=True)
    organism = models.CharField(max_length=255, blank=True)
    intervention = models.TextField(blank=True)
    outcome = models.TextField(blank=True)
    comparator = models.TextField(blank=True)
    mechanism = models.TextField(blank=True)

    def __str__(self) -> str:
        return f"Question {self.id}"


class ProjectAttachment(UUIDModel):
    """File attachment linked to a project (stored in R2)."""
    project = models.ForeignKey(Project, related_name="attachments", on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    object_key = models.CharField(max_length=512, help_text="R2 object key")
    url = models.URLField(max_length=1024)
    content_type = models.CharField(max_length=128, blank=True)
    size = models.BigIntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.name} ({self.project.title})"
