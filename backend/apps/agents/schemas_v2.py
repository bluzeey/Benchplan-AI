"""
Enhanced Pydantic schemas for structured AI planning outputs.
These schemas provide strict validation and rich context for multi-stage generation.
"""
from __future__ import annotations

from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field, field_validator


class ParsedHypothesis(BaseModel):
    """Parsed hypothesis with rich context extraction."""

    domain: str = "other"
    hypothesis: str
    intervention: str = ""
    organism_or_model: str = ""
    comparator_or_control: str = ""
    primary_outcome: str = ""
    threshold: str = ""
    assay_or_measurement: str = ""
    duration: str = ""
    mechanism: str = ""
    required_capabilities: list[str] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)
    safety_flags: list[str] = Field(default_factory=list)

    # New: complexity assessment
    complexity_score: float = Field(default=0.5, ge=0.0, le=1.0)
    uncertainty_level: str = Field(default="medium")


class ProtocolStep(BaseModel):
    """Single protocol step with rich operational details."""

    step_number: int
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=20)
    duration_minutes: int = Field(ge=0)
    critical_parameters: list[str] = Field(default_factory=list)
    equipment: list[str] = Field(default_factory=list)
    expected_output: str = ""
    citations: list[str] = Field(default_factory=list)
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    needs_review: bool = True
    failure_modes: list[str] = Field(default_factory=list)
    qc_checks: list[str] = Field(default_factory=list)

    # New: cost implications
    labor_skill_level: str = Field(default="standard")  # junior, standard, senior, specialist
    consumables_cost_estimate: float = Field(default=0.0, ge=0.0)


class MaterialSpec(BaseModel):
    """Material/reagent specification with uncertainty bands."""

    name: str = Field(min_length=2, max_length=255)
    category: str = Field(pattern=r"^(reagents|assays_kits|consumables|equipment|services)$")
    role: str = ""
    supplier: str = ""
    catalog_number: str = ""
    catalog_source_url: str = ""
    quantity: str = ""

    # Cost with uncertainty bands
    estimated_unit_cost: float = Field(ge=0.0)
    estimated_unit_cost_min: float = Field(ge=0.0)
    estimated_unit_cost_max: float = Field(ge=0.0)
    estimated_total_cost: float = Field(ge=0.0)
    estimated_total_cost_min: float = Field(ge=0.0)
    estimated_total_cost_max: float = Field(ge=0.0)

    lead_time_days_min: int = Field(default=1, ge=0)
    lead_time_days_max: int = Field(default=14, ge=0)
    storage_conditions: str = ""
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    needs_supplier_verification: bool = True

    # New: sourcing notes
    alternative_suppliers: list[str] = Field(default_factory=list)
    cost_drivers: list[str] = Field(default_factory=list)

    @field_validator("estimated_unit_cost_max")
    @classmethod
    def max_cost_gte_min(cls, v: float, info: Any) -> float:
        if "estimated_unit_cost_min" in info.data and v < info.data["estimated_unit_cost_min"]:
            return info.data["estimated_unit_cost_min"]
        return v


class LaborLine(BaseModel):
    """Labor cost specification with skill tiers."""

    role: str  # e.g., "Research Associate", "Postdoc", "Lab Manager"
    skill_level: str  # junior, standard, senior, specialist
    hours_min: float = Field(ge=0.0)
    hours_max: float = Field(ge=0.0)
    hourly_rate: float = Field(ge=0.0)
    hourly_rate_min: float = Field(ge=0.0)
    hourly_rate_max: float = Field(ge=0.0)
    total_cost_min: float = Field(ge=0.0)
    total_cost_max: float = Field(ge=0.0)
    assumptions: str = ""
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)


class TimelinePhase(BaseModel):
    """Timeline phase with dependency-aware scheduling."""

    phase_number: int
    title: str = Field(min_length=3, max_length=200)
    start_week: int = Field(ge=1)
    end_week: int = Field(ge=1)
    dependencies: list[int] = Field(default_factory=list)
    parallelizable: bool = False

    # Rich scheduling context
    risk_of_delay: str = ""
    mitigation: str = ""
    deliverables: list[str] = Field(default_factory=list)
    go_no_go_criteria: list[str] = Field(default_factory=list)
    buffer_weeks: float = Field(default=0.0, ge=0.0)

    # Resource requirements
    required_personnel: list[str] = Field(default_factory=list)
    required_equipment: list[str] = Field(default_factory=list)

    # Confidence
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)

    @field_validator("end_week")
    @classmethod
    def end_after_start(cls, v: int, info: Any) -> int:
        if "start_week" in info.data and v < info.data["start_week"]:
            return info.data["start_week"]
        return v


class BudgetEstimate(BaseModel):
    """Complete budget estimate with category breakdown."""

    materials: list[MaterialSpec]
    labor: list[LaborLine]
    equipment_use: list[dict[str, Any]] = Field(default_factory=list)
    other_costs: list[dict[str, Any]] = Field(default_factory=list)

    # Totals with uncertainty
    subtotal_min: float = Field(ge=0.0)
    subtotal_max: float = Field(ge=0.0)
    contingency_min: float = Field(ge=0.0)
    contingency_max: float = Field(ge=0.0)
    total_min: float = Field(ge=0.0)
    total_max: float = Field(ge=0.0)

    # Meta
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    primary_cost_drivers: list[str] = Field(default_factory=list)
    cost_saving_opportunities: list[str] = Field(default_factory=list)
    budget_assumptions: list[str] = Field(default_factory=list)


class TimelineEstimate(BaseModel):
    """Complete timeline with critical path analysis."""

    phases: list[TimelinePhase]

    # Critical path
    critical_path_weeks: int = Field(ge=0)
    total_duration_weeks_min: int = Field(ge=0)
    total_duration_weeks_max: int = Field(ge=0)
    parallelizable_savings_weeks: float = Field(default=0.0, ge=0.0)

    # Risk-adjusted
    risk_adjusted_duration_min: int = Field(ge=0)
    risk_adjusted_duration_max: int = Field(ge=0)

    # Meta
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    critical_path_phases: list[int] = Field(default_factory=list)
    timeline_assumptions: list[str] = Field(default_factory=list)
    major_risks: list[str] = Field(default_factory=list)


class CritiqueIssue(BaseModel):
    """Single critique issue from reviewer."""

    severity: str = Field(pattern=r"^(high|medium|low)$")
    category: str  # scientific, operational, budget, timeline, safety
    description: str = Field(min_length=10)
    suggested_fix: str = ""
    affects_sections: list[str] = Field(default_factory=list)


class PlanCritique(BaseModel):
    """Structured critique of generated plan."""

    issues: list[CritiqueIssue]
    overall_quality_score: float = Field(ge=0.0, le=1.0)
    revision_needed: bool = False
    revision_priority: list[str] = Field(default_factory=list)  # ordered list of what to fix first


class ValidationCriteria(BaseModel):
    """Validation checkpoints for the experiment."""

    primary_endpoint: str = ""
    secondary_endpoints: list[str] = Field(default_factory=list)
    success_criteria: list[str] = Field(default_factory=list)
    failure_criteria: list[str] = Field(default_factory=list)
    statistical_analysis: str = ""
    quality_controls: list[str] = Field(default_factory=list)
    stopping_rules: list[str] = Field(default_factory=list)


class RiskAssessment(BaseModel):
    """Risk and safety assessment."""

    risks: list[dict[str, Any]]
    warning: str = ""
    overall_risk_level: str = Field(default="low", pattern=r"^(low|medium|high|critical)$")
    mitigation_budget_impact: float = Field(default=0.0, ge=0.0)  # additional budget needed for mitigations
    mitigation_timeline_impact_weeks: float = Field(default=0.0, ge=0.0)


class CitationLink(BaseModel):
    """Link between plan section and literature reference."""

    reference_id: str
    section_type: str  # protocol, materials, timeline, budget, validation
    section_index: int
    relevance: str  # direct_support, partial_support, background, contradictory
    quote: str = ""


class EvidenceCoverage(BaseModel):
    """Assessment of how well the plan is grounded in literature."""

    coverage_score: float = Field(ge=0.0, le=1.0)
    well_supported_sections: list[str] = Field(default_factory=list)
    weakly_supported_sections: list[str] = Field(default_factory=list)
    unsupported_claims: list[str] = Field(default_factory=list)
    citation_links: list[CitationLink] = Field(default_factory=list)


class ExperimentPlanOutput(BaseModel):
    """Complete structured experiment plan output."""

    title: str
    executive_summary: str

    # Context
    hypothesis: str
    domain: str
    complexity_score: float
    uncertainty_level: str

    # Core components
    protocol: list[ProtocolStep]
    materials: list[MaterialSpec]
    budget: BudgetEstimate
    timeline: TimelineEstimate
    validation: ValidationCriteria
    risks: RiskAssessment

    # Grounding
    evidence_coverage: EvidenceCoverage
    assumptions: list[str]
    references_used: list[str]  # IDs of references that informed the plan

    # Quality
    generation_confidence: float = Field(ge=0.0, le=1.0)
    sections_needing_review: list[str] = Field(default_factory=list)
