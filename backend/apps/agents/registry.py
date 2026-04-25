from __future__ import annotations

from decimal import Decimal

from django.utils import timezone

from apps.feedback.services import retrieve_similar_feedback
from apps.literature.models import LiteratureQcRun, Reference
from apps.literature.services import run_literature_search
from apps.literature.services.scoring import score_novelty
from apps.planning.models import BudgetLine, ExperimentPlan, Material, PlanSection, ProtocolStep, TimelinePhase
from apps.planning.services.budget_estimator import estimate_budget
from apps.planning.services.citation_verifier import verify_citations
from apps.planning.services.plan_generator import build_plan_title, generate_protocol_outline
from apps.planning.services.timeline_builder import default_timeline
from apps.planning.services.validation_builder import build_validation
from apps.projects.models import ExperimentQuestion
from apps.safety.models import SafetyAssessment
from apps.safety.services import triage_hypothesis

from .models import AgentEvent, AgentRun


def parse_hypothesis(raw_text: str) -> dict:
    text = raw_text.lower()
    domain = "other"
    if any(token in text for token in ["mouse", "mice", "rat"]):
        domain = "animal_model"
    elif any(token in text for token in ["hela", "cell", "cells"]):
        domain = "cell_biology"
    elif any(token in text for token in ["biosensor", "diagnostic", "blood"]):
        domain = "diagnostics"

    parsed = {
        "domain": domain,
        "hypothesis": raw_text,
        "intervention": "",
        "organism_or_model": "",
        "comparator_or_control": "",
        "primary_outcome": "",
        "threshold": "",
        "assay_or_measurement": "",
        "duration": "",
        "mechanism": "",
        "required_capabilities": [],
        "missing_information": [],
        "safety_flags": [],
    }

    if "lactobacillus" in text or "lgg" in text:
        parsed["intervention"] = "Lactobacillus rhamnosus GG supplementation"
    if "c57bl/6" in text:
        parsed["organism_or_model"] = "C57BL/6 mice"
    if "control" in text:
        parsed["comparator_or_control"] = "control group"
    if "fitc" in text:
        parsed["assay_or_measurement"] = "FITC-dextran assay"
    if "%" in raw_text:
        parsed["threshold"] = "effect threshold specified"
    if "weeks" in text or "week" in text:
        parsed["duration"] = "duration specified"
    if "claudin" in text or "occludin" in text:
        parsed["mechanism"] = "tight junction modulation"

    if not parsed["comparator_or_control"]:
        parsed["missing_information"].append("No explicit control/comparator")
    if not parsed["duration"]:
        parsed["missing_information"].append("No clear duration")
    if not parsed["threshold"]:
        parsed["missing_information"].append("No measurable threshold")

    return parsed


def _add_event(agent_run: AgentRun, label: str, payload: dict | None = None) -> None:
    AgentEvent.objects.create(run=agent_run, label=label, payload=payload or {})


def run_literature_qc(qc_run_id: str, agent_run_id: str) -> LiteratureQcRun:
    qc_run = LiteratureQcRun.objects.select_related("question").get(id=qc_run_id)
    question = qc_run.question
    agent_run = AgentRun.objects.get(id=agent_run_id)

    _add_event(agent_run, "Hypothesis parsed")
    parsed = parse_hypothesis(question.raw_text)
    question.parsed_json = parsed
    question.domain = parsed.get("domain", "")
    question.organism = parsed.get("organism_or_model", "")
    question.intervention = parsed.get("intervention", "")
    question.outcome = parsed.get("primary_outcome", "")
    question.comparator = parsed.get("comparator_or_control", "")
    question.mechanism = parsed.get("mechanism", "")
    question.save()

    _add_event(agent_run, "Safety triage complete")
    triage = triage_hypothesis(question.raw_text)
    SafetyAssessment.objects.create(
        question=question,
        state=triage["state"],
        categories=triage["categories"],
        required_approvals=triage["required_approvals"],
        missing_information=triage["missing_information"],
        warning=triage["warning"],
    )

    _add_event(agent_run, "Searching literature")
    queries, normalized_refs = run_literature_search(question.raw_text)
    qc_run.query_plan = {"queries": queries}
    qc_run.references.all().delete()
    for index, ref in enumerate(normalized_refs, start=1):
        Reference.objects.create(
            qc_run=qc_run,
            source=ref.get("source", "unknown"),
            title=ref.get("title", "Untitled"),
            year=ref.get("year"),
            url=ref.get("url", ""),
            doi=ref.get("doi", ""),
            pmid=ref.get("pmid", ""),
            protocol_id=ref.get("protocol_id", ""),
            relevance_score=Decimal(str(max(0.55, 0.9 - index * 0.1))),
            why_relevant=ref.get("why_relevant", ""),
            match_json={
                "organism": "matched" if question.organism else "unknown",
                "intervention": "matched" if question.intervention else "partial",
                "endpoint": "matched" if parsed.get("assay_or_measurement") else "partial",
                "threshold": "not matched" if not parsed.get("threshold") else "partial",
            },
        )

    _add_event(agent_run, "Scoring novelty")
    novelty = score_novelty(question.raw_text, normalized_refs)
    qc_run.novelty_signal = novelty["novelty_signal"]
    qc_run.confidence = Decimal(str(novelty["confidence"]))
    qc_run.summary = novelty["summary"]
    qc_run.scoring_breakdown = novelty["scoring_breakdown"]
    qc_run.status = "completed"
    qc_run.completed_at = timezone.now()
    qc_run.save()

    _add_event(agent_run, "Novelty result ready", {"novelty_signal": qc_run.novelty_signal})
    agent_run.status = "completed"
    agent_run.output_payload = {"qc_run_id": str(qc_run.id), "novelty_signal": qc_run.novelty_signal}
    agent_run.save(update_fields=["status", "output_payload", "updated_at"])
    return qc_run


def _build_materials() -> list[dict]:
    return [
        {
            "name": "Intervention reagent",
            "category": "reagents",
            "role": "Primary intervention component",
            "supplier": "",
            "catalog_number": "",
            "catalog_source_url": "",
            "quantity": "1 batch",
            "estimated_unit_cost": Decimal("1200.00"),
            "estimated_total_cost": Decimal("1200.00"),
            "lead_time_days_min": 7,
            "lead_time_days_max": 21,
            "storage_conditions": "Per supplier documentation",
            "confidence": Decimal("0.55"),
            "needs_supplier_verification": True,
        },
        {
            "name": "Assay kit",
            "category": "assays_kits",
            "role": "Endpoint measurement",
            "supplier": "",
            "catalog_number": "",
            "catalog_source_url": "",
            "quantity": "2 kits",
            "estimated_unit_cost": Decimal("850.00"),
            "estimated_total_cost": Decimal("1700.00"),
            "lead_time_days_min": 5,
            "lead_time_days_max": 14,
            "storage_conditions": "2-8C",
            "confidence": Decimal("0.60"),
            "needs_supplier_verification": True,
        },
        {
            "name": "Consumables bundle",
            "category": "consumables",
            "role": "Daily lab operations",
            "supplier": "",
            "catalog_number": "",
            "catalog_source_url": "",
            "quantity": "1 lot",
            "estimated_unit_cost": Decimal("950.00"),
            "estimated_total_cost": Decimal("950.00"),
            "lead_time_days_min": 3,
            "lead_time_days_max": 10,
            "storage_conditions": "Room temperature",
            "confidence": Decimal("0.72"),
            "needs_supplier_verification": True,
        },
    ]


def generate_plan_from_qc(qc_run_id: str, agent_run_id: str) -> ExperimentPlan:
    qc_run = LiteratureQcRun.objects.select_related("question", "question__project").get(id=qc_run_id)
    question: ExperimentQuestion = qc_run.question
    project = question.project
    agent_run = AgentRun.objects.get(id=agent_run_id)

    parsed = question.parsed_json or parse_hypothesis(question.raw_text)
    references = list(qc_run.references.values("id", "title", "source", "year", "doi", "url", "relevance_score", "why_relevant"))

    _add_event(agent_run, "Generating protocol")
    protocol = generate_protocol_outline(parsed)
    _add_event(agent_run, "Estimating materials")
    materials = _build_materials()

    _add_event(agent_run, "Estimating budget")
    budget_totals = estimate_budget(materials)
    budget_lines = [
        {"category": "reagents", "label": "Intervention reagents", "quantity": Decimal("1"), "unit_cost": Decimal("1200.00"), "total_cost": Decimal("1200.00"), "assumptions": "Catalog number requires buyer verification.", "confidence": Decimal("0.58")},
        {"category": "consumables", "label": "Lab consumables", "quantity": Decimal("1"), "unit_cost": Decimal("950.00"), "total_cost": Decimal("950.00"), "assumptions": "Based on medium-throughput run.", "confidence": Decimal("0.70")},
        {"category": "assays", "label": "Measurement kits", "quantity": Decimal("2"), "unit_cost": Decimal("850.00"), "total_cost": Decimal("1700.00"), "assumptions": "Two kit estimate with overage.", "confidence": Decimal("0.62")},
        {"category": "labor", "label": "Lab staff", "quantity": Decimal("80"), "unit_cost": Decimal("75.00"), "total_cost": budget_totals["labor"], "assumptions": "80 hours blended effort.", "confidence": Decimal("0.66")},
        {"category": "contingency", "label": "Contingency", "quantity": Decimal("1"), "unit_cost": budget_totals["contingency_high"], "total_cost": budget_totals["contingency_high"], "assumptions": "15-20% risk buffer.", "confidence": Decimal("0.75")},
    ]

    _add_event(agent_run, "Building timeline")
    timeline = default_timeline()
    _add_event(agent_run, "Validating plan")
    validation = build_validation(parsed)

    safety_triage = triage_hypothesis(question.raw_text)
    feedback_examples = retrieve_similar_feedback(parsed.get("domain", "other"), limit=2)
    feedback_lessons = [example.lesson for example in feedback_examples]

    plan_json = {
        "title": build_plan_title(question.raw_text),
        "executive_summary": "Draft operational experiment plan generated from literature QC and prior feedback examples.",
        "novelty_context": {
            "signal": qc_run.novelty_signal,
            "summary": qc_run.summary,
            "key_references": references,
        },
        "experimental_design": {
            "hypothesis": question.raw_text,
            "objective": "Test intervention effect against defined control and endpoint.",
            "experimental_groups": ["Intervention", "Control"],
            "controls": [parsed.get("comparator_or_control") or "Control condition required"],
            "replicates": "TBD by scientist",
            "randomization": "Recommended",
            "blinding": "Recommended where feasible",
            "inclusion_exclusion_criteria": "To be defined by scientist",
        },
        "protocol": protocol,
        "materials": [{**m, "catalog_note": "Catalog number requires buyer verification."} for m in materials],
        "budget": [{k: (str(v) if isinstance(v, Decimal) else v) for k, v in line.items()} for line in budget_lines],
        "timeline": timeline,
        "validation": validation,
        "risks_and_safety": [
            {
                "category": category,
                "state": safety_triage["state"],
                "required_approvals": safety_triage["required_approvals"],
            }
            for category in safety_triage["categories"]
        ],
        "assumptions": [
            "Catalog number requires buyer verification.",
            "Budget excludes institution-specific overhead.",
            *feedback_lessons,
        ],
        "references": references,
    }

    citation_report = verify_citations(plan_json, references)
    if citation_report["coverage"] < 0.5:
        plan_json["assumptions"].append("Evidence coverage is limited; major steps need scientist verification.")

    plan = ExperimentPlan.objects.create(
        project=project,
        question=question,
        qc_run=qc_run,
        title=plan_json["title"],
        status="completed",
        executive_summary=plan_json["executive_summary"],
        plan_json=plan_json,
        estimated_budget_min=budget_totals["total_min"],
        estimated_budget_max=budget_totals["total_max"],
        estimated_duration_weeks_min=8,
        estimated_duration_weeks_max=10,
        scientist_review_status="required",
    )

    section_specs = [
        ("overview", "Overview", 1, {"executive_summary": plan.executive_summary}),
        ("novelty_qc", "Novelty QC", 2, plan_json["novelty_context"]),
        ("protocol", "Protocol", 3, {"steps": protocol}),
        ("materials", "Materials", 4, {"items": plan_json["materials"]}),
        ("budget", "Budget", 5, {"lines": plan_json["budget"]}),
        ("timeline", "Timeline", 6, {"phases": timeline}),
        ("validation", "Validation", 7, validation),
        ("risks_safety", "Risks & safety", 8, {"risks": plan_json["risks_and_safety"], "warning": safety_triage["warning"]}),
        ("assumptions", "Assumptions", 9, {"assumptions": plan_json["assumptions"]}),
        ("references", "References", 10, {"references": references}),
    ]
    for key, title, order, content in section_specs:
        PlanSection.objects.create(plan=plan, key=key, title=title, order=order, content_json=content, content_markdown=str(content), confidence=Decimal("0.65"), needs_review=True)

    for step in protocol:
        ProtocolStep.objects.create(
            plan=plan,
            step_number=step["step_number"],
            title=step["title"],
            description=step["description"],
            duration_minutes=step.get("duration_minutes"),
            critical_parameters=step.get("critical_parameters", []),
            equipment=step.get("equipment", []),
            expected_output=step.get("expected_output", ""),
            citations=step.get("citations", []),
            confidence=Decimal(str(step.get("confidence", 0.5))),
            safety_notes=safety_triage["warning"],
        )

    for material in materials:
        Material.objects.create(plan=plan, currency="USD", **material)

    for line in budget_lines:
        BudgetLine.objects.create(plan=plan, **line)

    for phase in timeline:
        TimelinePhase.objects.create(
            plan=plan,
            phase_number=phase["phase_number"],
            title=phase["title"],
            start_week=phase["start_week"],
            end_week=phase["end_week"],
            dependencies=phase.get("dependencies", []),
            deliverables=[],
            risks=[],
            parallelizable=phase.get("parallelizable", False),
            risk_of_delay=phase.get("risk_of_delay", ""),
            mitigation=phase.get("mitigation", ""),
        )

    _add_event(agent_run, "Scientist review required")
    _add_event(agent_run, "Plan ready", {"plan_id": str(plan.id)})
    agent_run.status = "completed"
    agent_run.output_payload = {"plan_id": str(plan.id)}
    agent_run.save(update_fields=["status", "output_payload", "updated_at"])
    return plan
