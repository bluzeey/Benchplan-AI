from django.db import models

from apps.common.models import UUIDModel


class ExperimentPlan(UUIDModel):
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE)
    question = models.ForeignKey("projects.ExperimentQuestion", on_delete=models.CASCADE)
    qc_run = models.ForeignKey("literature.LiteratureQcRun", null=True, on_delete=models.SET_NULL)
    title = models.CharField(max_length=255)
    status = models.CharField(max_length=32, default="draft")
    version = models.IntegerField(default=1)
    executive_summary = models.TextField(blank=True)
    plan_json = models.JSONField(default=dict)
    estimated_budget_min = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    estimated_budget_max = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    estimated_duration_weeks_min = models.IntegerField(null=True)
    estimated_duration_weeks_max = models.IntegerField(null=True)
    scientist_review_status = models.CharField(max_length=32, default="required")


class PlanSection(UUIDModel):
    plan = models.ForeignKey(ExperimentPlan, related_name="sections", on_delete=models.CASCADE)
    key = models.CharField(max_length=64)
    title = models.CharField(max_length=255)
    order = models.IntegerField(default=0)
    content_markdown = models.TextField(blank=True)
    content_json = models.JSONField(default=dict)
    confidence = models.DecimalField(max_digits=4, decimal_places=3, null=True)
    needs_review = models.BooleanField(default=True)


class ProtocolStep(UUIDModel):
    plan = models.ForeignKey(ExperimentPlan, related_name="protocol_steps", on_delete=models.CASCADE)
    step_number = models.IntegerField()
    title = models.CharField(max_length=255)
    description = models.TextField()
    duration_minutes = models.IntegerField(null=True)
    critical_parameters = models.JSONField(default=list)
    equipment = models.JSONField(default=list)
    expected_output = models.TextField(blank=True)
    citations = models.JSONField(default=list)
    safety_notes = models.TextField(blank=True)
    confidence = models.DecimalField(max_digits=4, decimal_places=3, null=True)


class Material(UUIDModel):
    plan = models.ForeignKey(ExperimentPlan, related_name="materials", on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=64)
    role = models.TextField(blank=True)
    supplier = models.CharField(max_length=255, blank=True)
    catalog_number = models.CharField(max_length=255, blank=True)
    catalog_source_url = models.URLField(blank=True)
    quantity = models.CharField(max_length=128, blank=True)
    estimated_unit_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    estimated_total_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    currency = models.CharField(max_length=8, default="USD")
    lead_time_days_min = models.IntegerField(null=True)
    lead_time_days_max = models.IntegerField(null=True)
    storage_conditions = models.CharField(max_length=255, blank=True)
    confidence = models.DecimalField(max_digits=4, decimal_places=3, null=True)
    needs_supplier_verification = models.BooleanField(default=True)


class BudgetLine(UUIDModel):
    plan = models.ForeignKey(ExperimentPlan, related_name="budget_lines", on_delete=models.CASCADE)
    category = models.CharField(max_length=64)
    label = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    assumptions = models.TextField(blank=True)
    confidence = models.DecimalField(max_digits=4, decimal_places=3, null=True)


class TimelinePhase(UUIDModel):
    plan = models.ForeignKey(ExperimentPlan, related_name="timeline_phases", on_delete=models.CASCADE)
    phase_number = models.IntegerField()
    title = models.CharField(max_length=255)
    start_week = models.IntegerField()
    end_week = models.IntegerField()
    dependencies = models.JSONField(default=list)
    deliverables = models.JSONField(default=list)
    risks = models.JSONField(default=list)
    parallelizable = models.BooleanField(default=False)
    risk_of_delay = models.CharField(max_length=255, blank=True)
    mitigation = models.TextField(blank=True)
