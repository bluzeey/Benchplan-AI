"""
AI-driven timeline generation.
Replaces static templates with dependency-aware, context-specific scheduling.
"""
from __future__ import annotations

from typing import Any

from apps.agents.llm_gateway import llm_gateway
from apps.agents.prompts import TIMELINE_GENERATION_V2_PROMPT
from apps.agents.schemas import TimelineEstimate, TimelinePhase
from apps.planning.services.web_search import search_competitor_studies


def calculate_critical_path(phases: list[dict[str, Any]]) -> tuple[int, list[int]]:
    """
    Calculate critical path through phases.
    Returns (critical_path_weeks, list of phase_numbers on critical path).
    """
    if not phases:
        return 0, []

    # Build dependency graph
    phase_by_num = {p["phase_number"]: p for p in phases}

    # Calculate earliest start for each phase
    earliest_start = {}
    for p in phases:
        deps = p.get("dependencies", [])
        if not deps:
            earliest_start[p["phase_number"]] = 1
        else:
            max_end = max(
                phase_by_num[d]["end_week"] for d in deps if d in phase_by_num
            )
            earliest_start[p["phase_number"]] = max_end + 1

    # Calculate earliest finish
    earliest_finish = {}
    for p in phases:
        es = earliest_start.get(p["phase_number"], 1)
        duration = p["end_week"] - p["start_week"] + 1
        earliest_finish[p["phase_number"]] = es + duration - 1

    # Find critical path (phases where any delay affects total duration)
    max_week = max(p["end_week"] for p in phases)
    critical_phases = []

    for p in phases:
        pn = p["phase_number"]
        # A phase is on critical path if its finish equals the project end
        # or if delaying it would delay dependent phases that are critical
        ef = earliest_finish.get(pn, 0)
        # Simple heuristic: phases that end at or near project end
        if ef >= max_week - 1:
            critical_phases.append(pn)

    # More accurate critical path - trace backwards from final phases
    final_phases = [p["phase_number"] for p in phases if p["end_week"] == max_week]
    critical_path = set(final_phases)

    changed = True
    while changed:
        changed = False
        for p in phases:
            if p["phase_number"] in critical_path:
                # Add dependencies that directly lead to this phase
                for dep in p.get("dependencies", []):
                    if dep not in critical_path:
                        critical_path.add(dep)
                        changed = True

    # Calculate critical path duration
    if critical_path:
        critical_starts = [phase_by_num[pn]["start_week"] for pn in critical_path if pn in phase_by_num]
        critical_ends = [phase_by_num[pn]["end_week"] for pn in critical_path if pn in phase_by_num]
        if critical_starts and critical_ends:
            critical_duration = max(critical_ends) - min(critical_starts) + 1
        else:
            critical_duration = max_week
    else:
        critical_duration = max_week

    return critical_duration, sorted(critical_path)


def generate_timeline_v2(
    hypothesis: str,
    parsed: dict[str, Any],
    protocol: list[dict[str, Any]],
    materials: list[dict[str, Any]],
    safety_approvals: list[str],
) -> dict[str, Any]:
    """
    Generate a context-aware timeline using AI.
    """
    # Extract lead times from materials
    max_lead_time = max(
        (m.get("lead_time_days_max", 14) for m in materials),
        default=14,
    )
    avg_lead_time = sum(
        m.get("lead_time_days_max", 14) for m in materials
    ) / max(len(materials), 1)

    # Search for similar study durations
    similar_studies = search_competitor_studies(hypothesis, parsed.get("domain", ""))

    # Calculate complexity-based risk buffers
    complexity = parsed.get("complexity_score", 0.5)
    uncertainty = parsed.get("uncertainty_level", "medium")

    context = {
        "hypothesis": hypothesis,
        "domain": parsed.get("domain", "other"),
        "protocol_steps": protocol,
        "materials": materials,
        "lead_times": {
            "max_days": max_lead_time,
            "avg_days": avg_lead_time,
            "weeks": max(1, int(max_lead_time / 7)),
        },
        "safety_approvals": safety_approvals,
        "similar_studies": similar_studies,
        "complexity_score": complexity,
        "uncertainty_level": uncertainty,
    }

    try:
        result = llm_gateway.generate_with_schema(
            prompt=TIMELINE_GENERATION_V2_PROMPT,
            payload=context,
            schema=TimelineEstimate,
            system_message="You are a research project scheduler. Build realistic, dependency-aware timelines.",
            temperature=0.3,
        )

        timeline = result.model_dump()

        # Recalculate critical path to ensure accuracy
        critical_weeks, critical_phases = calculate_critical_path(timeline.get("phases", []))
        timeline["critical_path_weeks"] = critical_weeks
        timeline["critical_path_phases"] = critical_phases

        return timeline

    except Exception as e:
        print(f"AI timeline generation failed: {e}")
        return _generate_fallback_timeline(
            protocol, materials, safety_approvals, complexity, max_lead_time
        )


def _generate_fallback_timeline(
    protocol: list[dict[str, Any]],
    materials: list[dict[str, Any]],
    safety_approvals: list[str],
    complexity: float,
    max_lead_time: int,
) -> dict[str, Any]:
    """Generate a structured fallback timeline based on protocol and materials."""

    # Calculate total protocol hours
    total_hours = sum(p.get("duration_minutes", 0) for p in protocol) / 60.0

    # Add 20% for setup, documentation, meetings
    total_hours *= 1.2

    # Convert to weeks (assuming 40-hour work weeks, 50% efficiency on this project)
    base_weeks = max(2, int(total_hours / 20))

    # Add material lead time (in weeks)
    procurement_weeks = max(1, int(max_lead_time / 7))

    # Add safety approval time if needed
    approval_weeks = 2 if safety_approvals else 0
    if "IACUC" in str(safety_approvals) or "IRB" in str(safety_approvals):
        approval_weeks = 6  # These take longer

    # Complexity buffers
    buffer_weeks = 0
    if complexity > 0.6:
        buffer_weeks = 1
    if complexity > 0.8:
        buffer_weeks = 2

    # Build phases based on typical experimental workflow
    phases = []
    current_week = 1

    # Phase 1: Approvals (if needed)
    if approval_weeks > 0:
        phases.append({
            "phase_number": 1,
            "title": "Regulatory approvals and protocol finalization",
            "start_week": current_week,
            "end_week": current_week + approval_weeks - 1,
            "dependencies": [],
            "parallelizable": False,
            "risk_of_delay": "Review backlog or protocol revisions required" if approval_weeks > 2 else "Minor revisions",
            "mitigation": "Submit early; maintain communication with review board",
            "deliverables": ["Approved protocol", "Safety clearance"],
            "go_no_go_criteria": ["All required approvals obtained"],
            "buffer_weeks": 0.5 if approval_weeks > 4 else 0,
            "required_personnel": ["PI", "Safety officer"],
            "required_equipment": [],
            "confidence": 0.6 if approval_weeks > 4 else 0.7,
        })
        current_week += approval_weeks

    # Phase 2: Procurement
    proc_start = current_week
    proc_end = current_week + procurement_weeks - 1
    phases.append({
        "phase_number": len(phases) + 1,
        "title": "Material procurement and preparation",
        "start_week": proc_start,
        "end_week": proc_end,
        "dependencies": [1] if approval_weeks > 0 else [],
        "parallelizable": approval_weeks > 0,  # Can run parallel with approvals if early ordering possible
        "risk_of_delay": f"Supplier lead times ({max_lead_time} days max)",
        "mitigation": "Order long-lead items immediately; identify alternative suppliers",
        "deliverables": ["All materials received and QC'd", "Reagent aliquots prepared"],
        "go_no_go_criteria": ["Critical reagents available", "QC passed"],
        "buffer_weeks": 0.5,
        "required_personnel": ["Lab manager", "Research associate"],
        "required_equipment": ["Storage equipment"],
        "confidence": 0.65,
    })
    current_week = proc_end + 1

    # Phase 3: Pilot (if complexity is high or new assay)
    pilot_duration = 1
    if complexity > 0.5:
        pilot_duration = 2

    pilot_start = current_week
    pilot_end = pilot_start + pilot_duration - 1
    phases.append({
        "phase_number": len(phases) + 1,
        "title": "Pilot experiment and assay validation",
        "start_week": pilot_start,
        "end_week": pilot_end,
        "dependencies": [len(phases)],  # Depends on procurement
        "parallelizable": False,
        "risk_of_delay": "Assay calibration issues or unexpected variability",
        "mitigation": "Pre-validate assay components; have troubleshooting protocol ready",
        "deliverables": ["Pilot data", "Assay performance validated", "Power calculation verified"],
        "go_no_go_criteria": ["CV < 20%", "Signal-to-noise acceptable", "Pilot demonstrates feasibility"],
        "buffer_weeks": 0.5 if complexity > 0.6 else 0,
        "required_personnel": ["Senior scientist", "Research associate"],
        "required_equipment": list(set(
            eq for step in protocol[:2] for eq in step.get("equipment", [])
        )),
        "confidence": 0.55 if complexity > 0.6 else 0.65,
    })
    current_week = pilot_end + 1

    # Phase 4: Main experiment
    # Estimate duration based on protocol hours and working schedule
    experiment_weeks = max(2, int(total_hours * 0.7 / 20))  # 70% of hours are main experiment
    if experiment_weeks < 2:
        experiment_weeks = 2

    # Add complexity buffer
    if complexity > 0.5:
        experiment_weeks += 1

    exp_start = current_week
    exp_end = exp_start + experiment_weeks - 1
    phases.append({
        "phase_number": len(phases) + 1,
        "title": "Main experiment execution",
        "start_week": exp_start,
        "end_week": exp_end,
        "dependencies": [len(phases)],  # Depends on pilot
        "parallelizable": False,
        "risk_of_delay": "Biological variability, technical failures, sample contamination",
        "mitigation": "Maintain QC logs; have backup samples; daily progress checks",
        "deliverables": ["Complete dataset", "QC reports", "Raw data archived"],
        "go_no_go_criteria": ["All samples collected", "Data completeness > 95%", "QC within specs"],
        "buffer_weeks": 1.0 if complexity > 0.6 else 0.5,
        "required_personnel": ["Research associate", "Lab technician"],
        "required_equipment": list(set(
            eq for step in protocol for eq in step.get("equipment", [])
        )),
        "confidence": 0.6,
    })
    current_week = exp_end + 1

    # Phase 5: Data analysis
    analysis_weeks = max(1, min(3, int(base_weeks * 0.3)))
    analysis_start = current_week
    analysis_end = analysis_start + analysis_weeks - 1
    phases.append({
        "phase_number": len(phases) + 1,
        "title": "Data analysis and interpretation",
        "start_week": analysis_start,
        "end_week": analysis_end,
        "dependencies": [len(phases)],  # Depends on main experiment
        "parallelizable": False,
        "risk_of_delay": "Analysis complexity higher than expected, software issues",
        "mitigation": "Pre-specify analysis plan; use validated pipelines; involve statistician early",
        "deliverables": ["Statistical analysis report", "Figures and tables", "Preliminary conclusions"],
        "go_no_go_criteria": ["All planned analyses completed", "Results meet quality thresholds"],
        "buffer_weeks": 0.5,
        "required_personnel": ["Biostatistician", "Senior scientist"],
        "required_equipment": ["Analysis software", "Computing resources"],
        "confidence": 0.65,
    })
    current_week = analysis_end + 1

    # Phase 6: Documentation
    phases.append({
        "phase_number": len(phases) + 1,
        "title": "Documentation and reporting",
        "start_week": current_week,
        "end_week": current_week,
        "dependencies": [len(phases)],
        "parallelizable": False,
        "risk_of_delay": "Report revisions, additional analysis requests",
        "mitigation": "Use standardized templates; maintain documentation throughout",
        "deliverables": ["Final report", "Data package", "Protocol refinements documented"],
        "go_no_go_criteria": ["Report approved", "Data archived"],
        "buffer_weeks": 0,
        "required_personnel": ["PI", "Research associate"],
        "required_equipment": [],
        "confidence": 0.8,
    })

    # Calculate critical path
    critical_weeks, critical_phases = calculate_critical_path(phases)

    total_min = phases[-1]["end_week"] if phases else 6
    total_max = sum(
        (p["end_week"] - p["start_week"] + 1 + p.get("buffer_weeks", 0))
        for p in phases
    )

    # Risk-adjusted durations
    risk_adjusted_min = int(total_min * 0.9)  # Optimistic
    risk_adjusted_max = int(total_max * 1.2)  # Pessimistic with cascading delays

    # Calculate parallelization savings
    # If approvals and procurement ran parallel, that's savings
    parallel_savings = 0
    if approval_weeks > 0 and procurement_weeks > 0:
        # Check if they could overlap
        overlap_possible = min(approval_weeks, procurement_weeks) * 0.5
        parallel_savings = overlap_possible

    return {
        "phases": phases,
        "critical_path_weeks": critical_weeks,
        "total_duration_weeks_min": total_min,
        "total_duration_weeks_max": total_max,
        "risk_adjusted_duration_min": risk_adjusted_min,
        "risk_adjusted_duration_max": risk_adjusted_max,
        "parallelizable_savings_weeks": parallel_savings,
        "confidence": 0.6 if complexity > 0.5 else 0.7,
        "critical_path_phases": critical_phases,
        "timeline_assumptions": [
            f"Calculated from {total_hours:.1f} hours of protocol work",
            f"Material lead times up to {max_lead_time} days",
            f"Safety approvals add {approval_weeks} weeks" if approval_weeks > 0 else "No safety approvals required",
            "50% time allocation to this project (20hr/week)",
            f"Complexity score {complexity:.2f} drives buffer allocation",
        ],
        "major_risks": [
            "Material delivery delays beyond quoted lead times",
            "Assay performance below pilot expectations" if complexity > 0.5 else "Standard assay risks",
            "Sample quality issues requiring repeats",
            "Analysis complexity underestimated",
        ],
    }


# Legacy compatibility
default_timeline = lambda **kwargs: generate_timeline_v2(
    hypothesis=kwargs.get("hypothesis", ""),
    parsed=kwargs.get("parsed", {}),
    protocol=kwargs.get("protocol", []),
    materials=kwargs.get("materials", []),
    safety_approvals=kwargs.get("safety_approvals", []),
)
