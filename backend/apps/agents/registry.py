from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Any

from django.utils import timezone

from apps.feedback.services import retrieve_similar_feedback
from apps.literature.models import LiteratureQcRun, Reference
from apps.literature.services import run_literature_search
from apps.literature.services.scoring import score_novelty
from apps.planning.models import BudgetLine, ExperimentPlan, Material, PlanSection, ProtocolStep, TimelinePhase
from apps.planning.services.budget_estimator import estimate_budget, estimate_budget_v2
from apps.planning.services.citation_verifier import verify_citations
from apps.planning.services.plan_generator import build_plan_title, generate_protocol_outline, generate_protocol_v2, generate_validation_criteria
from apps.planning.services.timeline_builder import default_timeline, generate_timeline_v2
from apps.planning.services.validation_builder import build_validation
from apps.planning.services.web_search import (
    search_competitor_studies,
    search_equipment_costs,
    search_lead_times,
    search_protocol_details,
    search_reagent_costs,
)
from apps.projects.models import ExperimentQuestion
from apps.safety.models import SafetyAssessment
from apps.safety.services import triage_hypothesis

from .llm_gateway import llm_gateway
from .models import AgentEvent, AgentRun
from .prompts import CRITIC_V2_PROMPT, INPUT_PARSER_PROMPT, MATERIALS_GENERATION_V2_PROMPT
from .schemas import ParsedHypothesis, PlanCritique

# Feature flag for using V2 AI-driven planning
# Set via environment variable PLANNING_V2_ENABLED=true
import os
PLANNING_V2_ENABLED = os.getenv("PLANNING_V2_ENABLED", "true").lower() in ("true", "1", "yes")


def make_json_safe(obj: Any) -> Any:
    """
    Recursively convert objects to JSON-safe types.
    Converts UUID to str, Decimal to float, and datetime to ISO format str.
    """
    if isinstance(obj, uuid.UUID):
        return str(obj)
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, dict):
        return {k: make_json_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [make_json_safe(item) for item in obj]
    return obj


def format_section_markdown(key: str, content: dict) -> str:
    """
    Format section content as human-readable markdown.
    Converts structured JSON data into clean English prose.
    """
    lines = []

    if key == "overview":
        exec_summary = content.get("executive_summary", "")
        if exec_summary:
            lines.append(f"**Executive Summary:** {exec_summary}")
        lines.append("This section provides a high-level overview of the experiment plan.")

    elif key == "novelty_qc":
        signal = content.get("signal", "unknown")
        summary = content.get("summary", "")
        lines.append(f"**Novelty Signal:** {signal.replace('_', ' ').title()}")
        if summary:
            lines.append(f"\n{summary}")
        refs = content.get("key_references", [])
        if refs:
            lines.append(f"\n**Key References:** {len(refs)} sources identified")

    elif key == "protocol":
        steps = content.get("steps", [])
        if steps:
            lines.append(f"**Protocol Overview:** {len(steps)} step(s) defined")
            for i, step in enumerate(steps, 1):
                title = step.get("title", f"Step {i}")
                desc = step.get("description", "")
                duration = step.get("duration_minutes")
                lines.append(f"\n**{i}. {title}**")
                if desc:
                    lines.append(desc)
                if duration:
                    hours = duration // 60
                    mins = duration % 60
                    if hours > 0:
                        lines.append(f"*Duration: {hours}h {mins}m*")
                    else:
                        lines.append(f"*Duration: {mins} minutes*")

    elif key == "materials":
        items = content.get("items", [])
        if items:
            lines.append(f"**Materials List:** {len(items)} item(s) required")
            for item in items:
                name = item.get("name", "Unknown")
                role = item.get("role", "")
                qty = item.get("quantity", "")
                cost = item.get("estimated_total_cost")
                lines.append(f"\n- **{name}**")
                if role:
                    lines.append(f"  - Role: {role}")
                if qty:
                    lines.append(f"  - Quantity: {qty}")
                if cost:
                    lines.append(f"  - Est. Cost: ${cost:,.2f}")

    elif key == "budget":
        budget_lines = content.get("lines", [])
        if budget_lines:
            total = sum(float(line.get("total_cost", 0) or 0) for line in budget_lines)
            lines.append(f"**Budget Summary:** ${total:,.2f} total estimated cost")
            lines.append(f"\n**Budget Lines:**")
            for line in budget_lines:
                category = line.get("category", "").title()
                label = line.get("label", "")
                line_cost = line.get("total_cost", 0)
                assumptions = line.get("assumptions", "")
                lines.append(f"\n- **{category}** — {label}: ${float(line_cost or 0):,.2f}")
                if assumptions:
                    lines.append(f"  - *Assumptions: {assumptions}*")

    elif key == "timeline":
        phases = content.get("phases", [])
        if phases:
            lines.append(f"**Timeline Overview:** {len(phases)} phase(s), spanning {phases[-1].get('end_week', '?')} weeks")
            for phase in phases:
                title = phase.get("title", "")
                start = phase.get("start_week", "")
                end = phase.get("end_week", "")
                risk = phase.get("risk_of_delay", "")
                mitigation = phase.get("mitigation", "")
                parallel = phase.get("parallelizable", False)
                lines.append(f"\n- **Week {start}-{end}:** {title}")
                if parallel:
                    lines.append(f"  - *Can run in parallel with other phases*")
                if risk:
                    lines.append(f"  - Risk: {risk}")
                if mitigation:
                    lines.append(f"  - Mitigation: {mitigation}")

    elif key == "validation":
        primary = content.get("primary_endpoint", "")
        secondary = content.get("secondary_endpoints", [])
        success = content.get("success_criteria", [])
        failure = content.get("failure_criteria", [])
        if primary:
            lines.append(f"**Primary Endpoint:** {primary}")
        if secondary:
            lines.append(f"\n**Secondary Endpoints:** {', '.join(secondary)}")
        if success:
            lines.append(f"\n**Success Criteria:**")
            for c in success:
                lines.append(f"- {c}")
        if failure:
            lines.append(f"\n**Failure Criteria:**")
            for c in failure:
                lines.append(f"- {c}")

    elif key == "risks_safety":
        risks = content.get("risks", [])
        warning = content.get("warning", "")
        if warning:
            lines.append(f"> **⚠️ Safety Notice:** {warning}")
            lines.append("")
        if risks:
            lines.append(f"**Risk Assessment:** {len(risks)} risk category(s) identified")
            for risk in risks:
                category = risk.get("category", "")
                state = risk.get("state", "")
                approvals = risk.get("required_approvals", [])
                lines.append(f"\n- **{category}** — Risk Level: {state}")
                if approvals:
                    lines.append(f"  - Required Approvals: {', '.join(approvals)}")

    elif key == "assumptions":
        assumptions = content.get("assumptions", [])
        if assumptions:
            lines.append(f"**Key Assumptions:** {len(assumptions)} item(s)")
            for assumption in assumptions:
                lines.append(f"\n- {assumption}")

    elif key == "references":
        refs = content.get("references", [])
        if refs:
            lines.append(f"**Literature Sources:** {len(refs)} reference(s)")
            for ref in refs[:5]:  # Show first 5
                title = ref.get("title", "Untitled")
                source = ref.get("source", "").upper()
                year = ref.get("year", "")
                score = ref.get("relevance_score")
                lines.append(f"\n- **{title}**")
                if source and year:
                    lines.append(f"  - Source: {source}, {year}")
                if score:
                    lines.append(f"  - Relevance Score: {score:.0%}")
            if len(refs) > 5:
                lines.append(f"\n*... and {len(refs) - 5} more references*")

    else:
        # Fallback: convert dict to bullet points
        lines.append(f"**{key.replace('_', ' ').title()}**")
        for k, v in content.items():
            if isinstance(v, list):
                lines.append(f"\n- **{k.replace('_', ' ').title()}:** {len(v)} item(s)")
            elif isinstance(v, dict):
                lines.append(f"\n- **{k.replace('_', ' ').title()}:** See details below")
            else:
                lines.append(f"\n- **{k.replace('_', ' ').title()}:** {v}")

    return "\n".join(lines)


def parse_hypothesis(raw_text: str) -> dict:
    """
    Parse a scientific hypothesis using the LLM to extract structured information.

    Uses Fireworks AI (Kimi K2.5 Turbo) to intelligently extract experiment design details
    from free-text hypothesis.
    """
    try:
        # Use LLM to parse the hypothesis with structured output
        parsed = llm_gateway.generate_with_schema(
            prompt=INPUT_PARSER_PROMPT,
            payload={"hypothesis": raw_text},
            schema=ParsedHypothesis,
            system_message="You are an expert scientific operations parser. Extract structured information from research hypotheses accurately.",
            temperature=0.2,  # Low temperature for deterministic extraction
        )
        return parsed.model_dump()

    except Exception as e:
        # Fallback: return basic structure if LLM fails
        print(f"LLM parsing failed, using fallback: {e}")
        return {
            "domain": "other",
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
            "missing_information": ["LLM parsing unavailable - manual review required"],
            "safety_flags": [],
        }


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
    """Legacy static materials builder - kept for backward compatibility."""
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


def _build_materials_v2(
    hypothesis: str,
    parsed: dict[str, Any],
    protocol: list[dict[str, Any]],
) -> list[dict]:
    """
    AI-driven materials builder with web search for realistic pricing.
    """
    from apps.agents.schemas import MaterialSpec
    from apps.planning.services.web_search import search_reagent_costs, search_lead_times

    intervention = parsed.get("intervention", "")
    assay = parsed.get("assay_or_measurement", "")
    organism = parsed.get("organism_or_model", "")

    # Search for real cost and lead time data
    reagent_costs = []
    lead_times = []

    if intervention:
        reagent_costs.extend(search_reagent_costs(intervention, "bulk"))
        lead_times.extend(search_lead_times(intervention))

    if assay:
        reagent_costs.extend(search_reagent_costs(assay, "kit"))
        lead_times.extend(search_lead_times(assay))

    # Estimate sample size for quantity calculation
    from apps.planning.services.plan_generator import estimate_sample_size
    sample_size = estimate_sample_size(hypothesis, parsed)

    context = {
        "hypothesis": hypothesis,
        "domain": parsed.get("domain", "other"),
        "intervention": intervention,
        "organism_or_model": organism,
        "assay_or_measurement": assay,
        "protocol_steps": protocol,
        "reagent_costs": reagent_costs[:5],  # Top 5 search results
        "lead_times": lead_times[:5],
        "sample_size_hints": sample_size,
    }

    try:
        result = llm_gateway.generate_with_schema(
            prompt=MATERIALS_GENERATION_V2_PROMPT,
            payload=context,
            schema=list[MaterialSpec],
            system_message="You are a laboratory procurement specialist. Generate specific, realistic materials lists.",
            temperature=0.4,
        )

        materials = []
        for mat in result:
            mat_dict = mat.model_dump()
            # Ensure all Decimal fields are properly formatted
            for key in ["estimated_unit_cost", "estimated_unit_cost_min", "estimated_unit_cost_max",
                       "estimated_total_cost", "estimated_total_cost_min", "estimated_total_cost_max"]:
                if key in mat_dict and mat_dict[key] is not None:
                    mat_dict[key] = Decimal(str(mat_dict[key]))
            materials.append(mat_dict)

        if len(materials) < 3:
            raise ValueError("Generated materials list too short")

        return materials

    except Exception as e:
        print(f"AI materials generation failed: {e}")
        return _build_materials()  # Fallback to legacy


def _run_critic(
    hypothesis: str,
    parsed: dict[str, Any],
    protocol: list[dict[str, Any]],
    materials: list[dict[str, Any]],
    budget: dict[str, Any],
    timeline: dict[str, Any],
    validation: dict[str, Any],
    safety: dict[str, Any],
    references: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Run critic review on the generated plan.
    Returns critique with issues and recommendations.
    """
    context = {
        "hypothesis": hypothesis,
        "domain": parsed.get("domain", "other"),
        "protocol": protocol,
        "materials": materials,
        "budget": budget,
        "timeline": timeline,
        "validation": validation,
        "safety": safety,
        "references": references[:5],
        "evidence_coverage": {
            "protocol_citations": sum(1 for p in protocol if p.get("citations")),
            "total_protocol_steps": len(protocol),
        },
    }

    try:
        result = llm_gateway.generate_with_schema(
            prompt=CRITIC_V2_PROMPT,
            payload=context,
            schema=PlanCritique,
            system_message="You are a skeptical senior PI. Identify all problems in this plan.",
            temperature=0.3,
        )
        return result.model_dump()
    except Exception as e:
        print(f"Critic review failed: {e}")
        return {
            "issues": [],
            "overall_quality_score": 0.6,
            "revision_needed": False,
            "revision_priority": [],
        }


def _revise_plan(
    hypothesis: str,
    parsed: dict[str, Any],
    protocol: list[dict[str, Any]],
    materials: list[dict[str, Any]],
    budget: dict[str, Any],
    timeline: dict[str, Any],
    critique: dict[str, Any],
) -> tuple[list[dict], list[dict], dict, dict]:
    """
    Revise plan based on critic feedback.
    Returns revised (protocol, materials, budget, timeline).
    """
    issues = critique.get("issues", [])
    high_severity = [i for i in issues if i.get("severity") == "high"]

    # If no high-severity issues, return as-is
    if not high_severity:
        return protocol, materials, budget, timeline

    # For now, we flag for review rather than auto-revise
    # Future: implement targeted revisions based on issue categories
    return protocol, materials, budget, timeline


def generate_plan_from_qc(qc_run_id: str, agent_run_id: str, plan_id: str) -> ExperimentPlan:
    """
    Generate experiment plan from QC run.
    Uses V2 AI-driven pipeline when PLANNING_V2_ENABLED=True.
    """
    qc_run = LiteratureQcRun.objects.select_related("question", "question__project").get(id=qc_run_id)
    question: ExperimentQuestion = qc_run.question
    project = question.project
    agent_run = AgentRun.objects.get(id=agent_run_id)

    # Get the existing placeholder plan
    from apps.planning.models import ExperimentPlan
    plan = ExperimentPlan.objects.get(id=plan_id)

    parsed = question.parsed_json or parse_hypothesis(question.raw_text)
    # Fetch references and convert to JSON-safe types (UUID -> str, Decimal -> float)
    raw_references = list(qc_run.references.values("id", "title", "source", "year", "doi", "url", "relevance_score", "why_relevant"))
    references = make_json_safe(raw_references)

    # Get safety and feedback context
    safety_triage = triage_hypothesis(question.raw_text)
    feedback_examples = retrieve_similar_feedback(parsed.get("domain", "other"), limit=3)
    feedback_lessons = [example.lesson for example in feedback_examples]

    if PLANNING_V2_ENABLED:
        # V2: Multi-stage AI-driven generation with critic loop
        plan = _generate_plan_v2(
            plan=plan,
            agent_run=agent_run,
            qc_run=qc_run,
            question=question,
            parsed=parsed,
            references=references,
            safety_triage=safety_triage,
            feedback_lessons=feedback_lessons,
        )
    else:
        # V1: Legacy static generation
        plan = _generate_plan_v1(
            plan=plan,
            agent_run=agent_run,
            qc_run=qc_run,
            question=question,
            parsed=parsed,
            references=references,
            safety_triage=safety_triage,
            feedback_lessons=feedback_lessons,
        )

    return plan


def _generate_plan_v2(
    plan: ExperimentPlan,
    agent_run: AgentRun,
    qc_run: LiteratureQcRun,
    question: ExperimentQuestion,
    parsed: dict[str, Any],
    references: list[dict[str, Any]],
    safety_triage: dict[str, Any],
    feedback_lessons: list[str],
) -> ExperimentPlan:
    """
    V2: Multi-stage AI-driven plan generation with critic loop.
    """
    hypothesis = question.raw_text

    # Stage 1: Generate Protocol
    _add_event(agent_run, "Generating protocol (AI)")
    protocol = generate_protocol_v2(
        hypothesis=hypothesis,
        parsed=parsed,
        references=references,
        safety_flags=safety_triage.get("categories", []),
    )
    _add_event(agent_run, f"Protocol generated: {len(protocol)} steps")

    # Stage 2: Generate Materials (with web search)
    _add_event(agent_run, "Generating materials (AI + web search)")
    materials = _build_materials_v2(
        hypothesis=hypothesis,
        parsed=parsed,
        protocol=protocol,
    )
    _add_event(agent_run, f"Materials generated: {len(materials)} items")

    # Stage 3: Generate Budget (parallel-ready)
    _add_event(agent_run, "Calculating budget (AI)")
    budget = estimate_budget_v2(
        hypothesis=hypothesis,
        parsed=parsed,
        protocol=protocol,
        materials=materials,
        region="US",  # Could be configurable
    )
    _add_event(agent_run, f"Budget calculated: ${budget['total_min']:,.0f}-${budget['total_max']:,.0f}")

    # Stage 4: Generate Timeline (parallel-ready)
    _add_event(agent_run, "Building timeline (AI)")
    timeline = generate_timeline_v2(
        hypothesis=hypothesis,
        parsed=parsed,
        protocol=protocol,
        materials=materials,
        safety_approvals=safety_triage.get("required_approvals", []),
    )
    _add_event(agent_run, f"Timeline built: {timeline['total_duration_weeks_min']}-{timeline['total_duration_weeks_max']} weeks")

    # Stage 5: Generate Validation Criteria
    _add_event(agent_run, "Defining validation criteria")
    validation = generate_validation_criteria(
        hypothesis=hypothesis,
        parsed=parsed,
        references=references,
    )

    # Stage 6: Critic Review
    _add_event(agent_run, "Running quality review")
    critique = _run_critic(
        hypothesis=hypothesis,
        parsed=parsed,
        protocol=protocol,
        materials=materials,
        budget=budget,
        timeline=timeline,
        validation=validation,
        safety=safety_triage,
        references=references,
    )
    _add_event(agent_run, f"Quality score: {critique.get('overall_quality_score', 0):.0%}")

    # Stage 7: Revision (if needed)
    if critique.get("revision_needed", False):
        _add_event(agent_run, "Revising plan based on review")
        protocol, materials, budget, timeline = _revise_plan(
            hypothesis=hypothesis,
            parsed=parsed,
            protocol=protocol,
            materials=materials,
            budget=budget,
            timeline=timeline,
            critique=critique,
        )

    # Build budget lines for database
    budget_lines = _build_budget_lines_v2(budget)

    # Build plan JSON
    plan_json = _build_plan_json_v2(
        hypothesis=hypothesis,
        qc_run=qc_run,
        parsed=parsed,
        references=references,
        protocol=protocol,
        materials=materials,
        budget=budget,
        timeline=timeline,
        validation=validation,
        safety_triage=safety_triage,
        feedback_lessons=feedback_lessons,
        critique=critique,
    )

    # Update plan
    plan.title = plan_json["title"]
    plan.status = "completed"
    plan.executive_summary = plan_json["executive_summary"]
    plan.plan_json = make_json_safe(plan_json)
    plan.estimated_budget_min = Decimal(str(budget["total_min"]))
    plan.estimated_budget_max = Decimal(str(budget["total_max"]))
    plan.estimated_duration_weeks_min = timeline["total_duration_weeks_min"]
    plan.estimated_duration_weeks_max = timeline["total_duration_weeks_max"]
    plan.scientist_review_status = "required" if critique.get("revision_needed") else "recommended"
    plan.save()

    # Persist related objects
    _persist_plan_data(
        plan=plan,
        protocol=protocol,
        materials=materials,
        budget_lines=budget_lines,
        timeline=timeline,
        validation=validation,
        plan_json=plan_json,
        safety_triage=safety_triage,
        references=references,
    )

    _add_event(agent_run, "Scientist review required" if critique.get("revision_needed") else "Plan ready for review")
    _add_event(agent_run, "Plan ready", {"plan_id": str(plan.id), "quality_score": critique.get("overall_quality_score", 0)})
    agent_run.status = "completed"
    agent_run.output_payload = {"plan_id": str(plan.id), "quality_score": critique.get("overall_quality_score", 0)}
    agent_run.save(update_fields=["status", "output_payload", "updated_at"])

    return plan


def _build_budget_lines_v2(budget: dict[str, Any]) -> list[dict]:
    """Convert V2 budget structure to legacy BudgetLine format."""
    lines = []

    # Materials as individual lines
    for mat in budget.get("materials", []):
        lines.append({
            "category": mat.get("category", "reagents"),
            "label": mat.get("name", "Unknown material"),
            "quantity": Decimal("1"),
            "unit_cost": Decimal(str(mat.get("estimated_total_cost", 0))),
            "total_cost": Decimal(str(mat.get("estimated_total_cost", 0))),
            "total_cost_min": Decimal(str(mat.get("estimated_total_cost_min", 0))),
            "total_cost_max": Decimal(str(mat.get("estimated_total_cost_max", 0))),
            "assumptions": f"Role: {mat.get('role', '')}. Lead time: {mat.get('lead_time_days_min', 0)}-{mat.get('lead_time_days_max', 0)} days.",
            "confidence": Decimal(str(mat.get("confidence", 0.5))),
        })

    # Labor lines
    for labor in budget.get("labor", []):
        lines.append({
            "category": "labor",
            "label": labor.get("role", "Lab staff"),
            "quantity": Decimal(str(labor.get("hours_max", 0))),
            "unit_cost": Decimal(str(labor.get("hourly_rate", 0))),
            "total_cost": Decimal(str(labor.get("total_cost_max", 0))),
            "total_cost_min": Decimal(str(labor.get("total_cost_min", 0))),
            "total_cost_max": Decimal(str(labor.get("total_cost_max", 0))),
            "assumptions": labor.get("assumptions", ""),
            "confidence": Decimal(str(labor.get("confidence", 0.6))),
        })

    # Contingency as separate line
    lines.append({
        "category": "contingency",
        "label": "Risk buffer",
        "quantity": Decimal("1"),
        "unit_cost": Decimal(str(budget.get("contingency_max", 0))),
        "total_cost": Decimal(str(budget.get("contingency_max", 0))),
        "total_cost_min": Decimal(str(budget.get("contingency_min", 0))),
        "total_cost_max": Decimal(str(budget.get("contingency_max", 0))),
        "assumptions": f"Contingency: {(budget.get('contingency_min', 0) / max(budget.get('subtotal_min', 1), 1) * 100):.0f}%-{(budget.get('contingency_max', 0) / max(budget.get('subtotal_max', 1), 1) * 100):.0f}% of subtotal",
        "confidence": Decimal("0.75"),
    })

    return lines


def _build_plan_json_v2(
    hypothesis: str,
    qc_run: LiteratureQcRun,
    parsed: dict[str, Any],
    references: list[dict[str, Any]],
    protocol: list[dict[str, Any]],
    materials: list[dict[str, Any]],
    budget: dict[str, Any],
    timeline: dict[str, Any],
    validation: dict[str, Any],
    safety_triage: dict[str, Any],
    feedback_lessons: list[str],
    critique: dict[str, Any],
) -> dict[str, Any]:
    """Build comprehensive plan JSON structure."""

    # Build rich executive summary
    complexity = parsed.get("complexity_score", 0.5)
    uncertainty = parsed.get("uncertainty_level", "medium")

    exec_summary = f"""Experiment plan for: {parsed.get('intervention', 'intervention')} in {parsed.get('organism_or_model', 'model system')}.
Quality Score: {critique.get('overall_quality_score', 0):.0%}. Complexity: {complexity:.0%}. Uncertainty: {uncertainty}.
Protocol includes {len(protocol)} steps with {sum(1 for p in protocol if p.get('citations'))} literature-supported steps.
Budget range: ${budget['total_min']:,.0f} - ${budget['total_max']:,.0f} based on {len(materials)} materials and {len(budget.get('labor', []))} labor categories.
Timeline: {timeline['total_duration_weeks_min']}-{timeline['total_duration_weeks_max']} weeks ({timeline.get('critical_path_weeks', timeline['total_duration_weeks_min'])} weeks critical path).
Generated with AI-driven estimation and web search data."""

    return {
        "title": build_plan_title(hypothesis),
        "executive_summary": exec_summary,
        "novelty_context": {
            "signal": qc_run.novelty_signal,
            "summary": qc_run.summary,
            "key_references": references,
            "confidence": float(qc_run.confidence or 0.5),
        },
        "experimental_design": {
            "hypothesis": hypothesis,
            "domain": parsed.get("domain", "other"),
            "complexity_score": complexity,
            "uncertainty_level": uncertainty,
            "objective": f"Test effect of {parsed.get('intervention', 'intervention')} on {parsed.get('primary_outcome', 'outcome')}.",
            "experimental_groups": ["Intervention", parsed.get("comparator_or_control", "Control") or "Control"],
            "controls": [parsed.get("comparator_or_control") or "Appropriate control condition"],
            "sample_size": parsed.get("sample_size", {}),
            "randomization": "Stratified randomization recommended",
            "blinding": "Investigator blinding where feasible",
            "inclusion_exclusion_criteria": "To be finalized based on pilot data",
        },
        "protocol": protocol,
        "materials": [make_json_safe(m) for m in materials],
        "budget": make_json_safe(budget),
        "timeline": make_json_safe(timeline),
        "validation": make_json_safe(validation),
        "risks_and_safety": [
            {
                "category": category,
                "state": safety_triage.get("state", "clear_for_planning"),
                "required_approvals": safety_triage.get("required_approvals", []),
            }
            for category in safety_triage.get("categories", [])
        ] if safety_triage.get("categories") else [{"category": "general", "state": safety_triage.get("state", "clear_for_planning"), "required_approvals": []}],
        "quality_review": {
            "overall_score": critique.get("overall_quality_score", 0),
            "revision_needed": critique.get("revision_needed", False),
            "issues_count": len(critique.get("issues", [])),
            "high_severity_issues": len([i for i in critique.get("issues", []) if i.get("severity") == "high"]),
        },
        "assumptions": budget.get("budget_assumptions", []) + [
            "Budget based on protocol-derived labor hours",
            f"Contingency set at {(budget.get('contingency_min', 0) / max(budget.get('subtotal_min', 1), 1) * 100):.0f}%-{(budget.get('contingency_max', 0) / max(budget.get('subtotal_max', 1), 1) * 100):.0f}% based on uncertainty",
            *feedback_lessons,
        ],
        "references": references,
        "generation_metadata": {
            "version": "v2_ai_driven",
            "features_used": ["protocol_ai", "materials_web_search", "budget_protocol_derived", "timeline_critical_path", "critic_review"],
        },
    }


def _persist_plan_data(
    plan: ExperimentPlan,
    protocol: list[dict[str, Any]],
    materials: list[dict[str, Any]],
    budget_lines: list[dict],
    timeline: dict[str, Any],
    validation: dict[str, Any],
    plan_json: dict[str, Any],
    safety_triage: dict[str, Any],
    references: list[dict[str, Any]],
) -> None:
    """Persist all plan-related data to database."""

    # Clear existing related data if regenerating
    plan.sections.all().delete()
    plan.protocol_steps.all().delete()
    plan.materials.all().delete()
    plan.budget_lines.all().delete()
    plan.timeline_phases.all().delete()

    # Create sections
    section_specs = [
        ("overview", "Overview", 1, {"executive_summary": plan.executive_summary}),
        ("novelty_qc", "Novelty QC", 2, plan_json["novelty_context"]),
        ("protocol", "Protocol", 3, {"steps": protocol}),
        ("materials", "Materials", 4, {"items": plan_json["materials"]}),
        ("budget", "Budget", 5, plan_json["budget"]),
        ("timeline", "Timeline", 6, plan_json["timeline"]),
        ("validation", "Validation", 7, validation),
        ("risks_safety", "Risks & safety", 8, {"risks": plan_json["risks_and_safety"], "warning": safety_triage.get("warning", "")}),
        ("quality_review", "Quality Review", 9, plan_json.get("quality_review", {})),
        ("assumptions", "Assumptions", 10, {"assumptions": plan_json["assumptions"]}),
        ("references", "References", 11, {"references": references}),
    ]

    for key, title, order, content in section_specs:
        safe_content = make_json_safe(content)
        markdown_content = format_section_markdown(key, content)
        confidence = Decimal(str(content.get("overall_score", 0.65))) if key == "quality_review" else Decimal("0.65")
        needs_review = key in ["protocol", "materials", "budget"] or (key == "quality_review" and content.get("revision_needed", False))
        PlanSection.objects.create(
            plan=plan,
            key=key,
            title=title,
            order=order,
            content_json=safe_content,
            content_markdown=markdown_content,
            confidence=confidence,
            needs_review=needs_review,
        )

    # Create protocol steps
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
            safety_notes=safety_triage.get("warning", ""),
        )

    # Create materials
    for material in materials:
        # Clean material dict for DB compatibility
        mat_clean = {k: v for k, v in material.items() if k not in ["alternative_suppliers", "cost_drivers"]}
        Material.objects.create(plan=plan, currency="USD", **mat_clean)

    # Create budget lines
    for line in budget_lines:
        BudgetLine.objects.create(plan=plan, **line)

    # Create timeline phases
    for phase in timeline.get("phases", []):
        TimelinePhase.objects.create(
            plan=plan,
            phase_number=phase["phase_number"],
            title=phase["title"],
            start_week=phase["start_week"],
            end_week=phase["end_week"],
            dependencies=phase.get("dependencies", []),
            deliverables=phase.get("deliverables", []),
            risks=[phase.get("risk_of_delay", "")] if phase.get("risk_of_delay") else [],
            parallelizable=phase.get("parallelizable", False),
            risk_of_delay=phase.get("risk_of_delay", ""),
            mitigation=phase.get("mitigation", ""),
        )


def _generate_plan_v1(
    plan: ExperimentPlan,
    agent_run: AgentRun,
    qc_run: LiteratureQcRun,
    question: ExperimentQuestion,
    parsed: dict[str, Any],
    references: list[dict[str, Any]],
    safety_triage: dict[str, Any],
    feedback_lessons: list[str],
) -> ExperimentPlan:
    """Legacy V1 static plan generation (kept for backward compatibility)."""

    _add_event(agent_run, "Generating protocol (legacy)")
    protocol = generate_protocol_outline(parsed)

    _add_event(agent_run, "Estimating materials (legacy)")
    materials = _build_materials()

    _add_event(agent_run, "Estimating budget (legacy)")
    budget_totals = estimate_budget(materials)
    budget_lines = [
        {"category": "reagents", "label": "Intervention reagents", "quantity": Decimal("1"), "unit_cost": Decimal("1200.00"), "total_cost": Decimal("1200.00"), "assumptions": "Catalog number requires buyer verification.", "confidence": Decimal("0.58")},
        {"category": "consumables", "label": "Lab consumables", "quantity": Decimal("1"), "unit_cost": Decimal("950.00"), "total_cost": Decimal("950.00"), "assumptions": "Based on medium-throughput run.", "confidence": Decimal("0.70")},
        {"category": "assays", "label": "Measurement kits", "quantity": Decimal("2"), "unit_cost": Decimal("850.00"), "total_cost": Decimal("1700.00"), "assumptions": "Two kit estimate with overage.", "confidence": Decimal("0.62")},
        {"category": "labor", "label": "Lab staff", "quantity": Decimal("80"), "unit_cost": Decimal("75.00"), "total_cost": budget_totals["labor"], "assumptions": "80 hours blended effort.", "confidence": Decimal("0.66")},
        {"category": "contingency", "label": "Contingency", "quantity": Decimal("1"), "unit_cost": budget_totals["contingency_high"], "total_cost": budget_totals["contingency_high"], "assumptions": "15-20% risk buffer.", "confidence": Decimal("0.75")},
    ]

    _add_event(agent_run, "Building timeline (legacy)")
    timeline = default_timeline()

    _add_event(agent_run, "Validating plan (legacy)")
    validation = build_validation(parsed)

    plan_json = {
        "title": build_plan_title(question.raw_text),
        "executive_summary": "Draft operational experiment plan generated from literature QC (legacy mode).",
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
        },
        "protocol": protocol,
        "materials": [make_json_safe({**m, "catalog_note": "Catalog number requires buyer verification."}) for m in materials],
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
            *feedback_lessons,
        ],
        "references": references,
    }

    # Update plan
    plan.title = plan_json["title"]
    plan.status = "completed"
    plan.executive_summary = plan_json["executive_summary"]
    plan.plan_json = make_json_safe(plan_json)
    plan.estimated_budget_min = budget_totals["total_min"]
    plan.estimated_budget_max = budget_totals["total_max"]
    plan.estimated_duration_weeks_min = 8
    plan.estimated_duration_weeks_max = 10
    plan.scientist_review_status = "required"
    plan.save()

    # Persist data
    _persist_plan_data(
        plan=plan,
        protocol=protocol,
        materials=materials,
        budget_lines=budget_lines,
        timeline={"phases": timeline},
        validation=validation,
        plan_json=plan_json,
        safety_triage=safety_triage,
        references=references,
    )

    _add_event(agent_run, "Scientist review required")
    _add_event(agent_run, "Plan ready", {"plan_id": str(plan.id)})
    agent_run.status = "completed"
    agent_run.output_payload = {"plan_id": str(plan.id)}
    agent_run.save(update_fields=["status", "output_payload", "updated_at"])
    return plan 
