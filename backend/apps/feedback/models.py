from django.contrib.auth import get_user_model
from django.db import models

from apps.common.models import UUIDModel

User = get_user_model()


class ReviewSession(UUIDModel):
    plan = models.ForeignKey("planning.ExperimentPlan", on_delete=models.CASCADE)
    reviewer = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    status = models.CharField(max_length=32, default="in_progress")
    overall_rating = models.IntegerField(null=True)
    completed_at = models.DateTimeField(null=True)


class ReviewAnnotation(UUIDModel):
    review_session = models.ForeignKey(ReviewSession, related_name="annotations", on_delete=models.CASCADE)
    section_key = models.CharField(max_length=64)
    target_model = models.CharField(max_length=64, blank=True)
    target_id = models.UUIDField(null=True)
    correction_type = models.CharField(max_length=64)
    original_text = models.TextField(blank=True)
    corrected_text = models.TextField()
    rationale = models.TextField(blank=True)
    severity = models.CharField(max_length=32)
    tags = models.JSONField(default=list)


class FeedbackExample(UUIDModel):
    source_annotation = models.OneToOneField(ReviewAnnotation, on_delete=models.CASCADE)
    domain = models.CharField(max_length=64)
    experiment_type = models.CharField(max_length=128)
    input_context = models.JSONField(default=dict)
    bad_output = models.TextField()
    corrected_output = models.TextField()
    lesson = models.TextField()
    approved_for_reuse = models.BooleanField(default=False)
