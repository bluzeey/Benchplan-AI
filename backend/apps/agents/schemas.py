from typing import Any

from pydantic import BaseModel, Field


class ParsedHypothesis(BaseModel):
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


class NoveltyResult(BaseModel):
    novelty_signal: str
    confidence: float
    summary: str
    scoring_breakdown: dict[str, Any] = Field(default_factory=dict)


class PlanProtocolStep(BaseModel):
    step_number: int
    title: str
    description: str
    duration_minutes: int = 0
    critical_parameters: list[str] = Field(default_factory=list)
    equipment: list[str] = Field(default_factory=list)
    expected_output: str = ""
    citations: list[str] = Field(default_factory=list)
    confidence: float = 0.5
    needs_review: bool = True


class PlanOutput(BaseModel):
    title: str
    executive_summary: str
    novelty_context: dict[str, Any]
    experimental_design: dict[str, Any]
    protocol: list[PlanProtocolStep]
    materials: list[dict[str, Any]]
    budget: list[dict[str, Any]]
    timeline: list[dict[str, Any]]
    validation: dict[str, Any]
    risks_and_safety: list[dict[str, Any]]
    assumptions: list[str]
    references: list[dict[str, Any]]


# ==========================================
# ENHANCED SCHEMAS V2 - For AI-driven planning
# ==========================================

from .schemas_v2 import (
    BudgetEstimate,
    CitationLink,
    CritiqueIssue,
    EvidenceCoverage,
    ExperimentPlanOutput,
    LaborLine,
    MaterialSpec,
    PlanCritique,
    ProtocolStep,
    RiskAssessment,
    TimelineEstimate,
    TimelinePhase,
    ValidationCriteria,
)
