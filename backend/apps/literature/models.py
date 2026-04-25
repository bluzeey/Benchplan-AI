from django.db import models

from apps.common.models import UUIDModel


class LiteratureQcRun(UUIDModel):
    question = models.ForeignKey("projects.ExperimentQuestion", related_name="qc_runs", on_delete=models.CASCADE)
    status = models.CharField(max_length=32, default="queued")
    novelty_signal = models.CharField(
        max_length=32,
        choices=[
            ("not_found", "Not found"),
            ("similar_work_exists", "Similar work exists"),
            ("exact_match_found", "Exact match found"),
            ("inconclusive", "Inconclusive"),
        ],
        blank=True,
    )
    confidence = models.DecimalField(max_digits=4, decimal_places=3, null=True)
    summary = models.TextField(blank=True)
    query_plan = models.JSONField(default=dict)
    scoring_breakdown = models.JSONField(default=dict)
    started_at = models.DateTimeField(null=True)
    completed_at = models.DateTimeField(null=True)


class Reference(UUIDModel):
    qc_run = models.ForeignKey(LiteratureQcRun, related_name="references", on_delete=models.CASCADE)
    source = models.CharField(max_length=64)
    title = models.TextField()
    authors = models.JSONField(default=list)
    year = models.IntegerField(null=True)
    abstract = models.TextField(blank=True)
    url = models.URLField(blank=True)
    doi = models.CharField(max_length=255, blank=True)
    pmid = models.CharField(max_length=64, blank=True)
    protocol_id = models.CharField(max_length=255, blank=True)
    relevance_score = models.DecimalField(max_digits=5, decimal_places=4, null=True)
    why_relevant = models.TextField(blank=True)
    match_json = models.JSONField(default=dict)
