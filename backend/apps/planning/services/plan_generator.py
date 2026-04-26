"""
AI-driven protocol and plan generation.
Replaces static templates with context-aware generation using LLM.
"""
from __future__ import annotations

from typing import Any

from apps.agents.llm_gateway import llm_gateway
from apps.agents.prompts import (
    PROTOCOL_GENERATION_V2_PROMPT,
    VALIDATION_GENERATION_PROMPT,
)
from apps.agents.schemas import ProtocolStep, ValidationCriteria
from apps.planning.services.web_search import (
    search_protocol_details,
    search_reagent_costs,
)


def estimate_sample_size(hypothesis: str, parsed: dict[str, Any]) -> dict[str, Any]:
    """
    Estimate required sample size based on hypothesis and effect size.
    """
    threshold = parsed.get("threshold", "")
    assay = parsed.get("assay_or_measurement", "")

    # Look for numeric thresholds (percentages, fold-changes, p-values)
    import re

    effect_size = None
    if threshold:
        # Look for percentage
        pct_match = re.search(r"(\d+)%", threshold)
        if pct_match:
            effect_size = float(pct_match.group(1)) / 100

        # Look for fold change
        fold_match = re.search(r"(\d+)\s*x|fold|times", threshold.lower())
        if fold_match:
            effect_size = float(fold_match.group(1))

    # Base sample size on effect size
    if effect_size:
        if effect_size >= 0.5:  # Large effect
            n_per_group = 8
        elif effect_size >= 0.3:  # Medium effect
            n_per_group = 16
        elif effect_size >= 0.1:  # Small effect
            n_per_group = 40
        else:
            n_per_group = 64
    else:
        # Default for unknown effect size
        n_per_group = 20

    # Adjust for assay variability
    high_variability_assays = [
        "behavioral",
        "cognitive",
        "in vivo imaging",
        "clinical",
        "ecg",
        "eeg",
    ]
    if any(va in assay.lower() for va in high_variability_assays):
        n_per_group = int(n_per_group * 1.5)

    return {
        "n_per_group": n_per_group,
        "total_n": n_per_group * 2,  # Intervention + control
        "effect_size_assumed": effect_size or 0.3,
        "power": 0.8,
        "alpha": 0.05,
    }


def generate_protocol_v2(
    hypothesis: str,
    parsed: dict[str, Any],
    references: list[dict[str, Any]],
    safety_flags: list[str],
) -> list[dict[str, Any]]:
    """
    Generate a hypothesis-specific protocol using AI.
    Replaces the static template with context-aware generation.
    """
    # Search for protocol details
    assay = parsed.get("assay_or_measurement", "")
    organism = parsed.get("organism_or_model", "")
    protocol_research = []
    if assay:
        protocol_research = search_protocol_details(assay, organism)

    # Prepare context
    context = {
        "hypothesis": hypothesis,
        "domain": parsed.get("domain", "other"),
        "organism_or_model": parsed.get("organism_or_model", ""),
        "intervention": parsed.get("intervention", ""),
        "comparator_or_control": parsed.get("comparator_or_control", ""),
        "primary_outcome": parsed.get("primary_outcome", ""),
        "assay_or_measurement": parsed.get("assay_or_measurement", ""),
        "duration": parsed.get("duration", ""),
        "mechanism": parsed.get("mechanism", ""),
        "safety_flags": safety_flags,
        "references": references[:5],  # Top 5 references
        "similar_studies": [],  # Could be populated from literature search
        "protocol_research": protocol_research,
    }

    try:
        # Generate protocol using LLM with structured output
        result = llm_gateway.generate_with_schema(
            prompt=PROTOCOL_GENERATION_V2_PROMPT,
            payload=context,
            schema=list[ProtocolStep],
            system_message="You are an expert experimental protocol designer. Generate detailed, hypothesis-specific protocols.",
            temperature=0.4,  # Slightly creative but grounded
        )

        # Convert to list of dicts
        protocol = []
        for step in result:
            protocol.append(step.model_dump())

        # Validate we got meaningful output
        if len(protocol) < 3:
            raise ValueError("Generated protocol too short")

        return protocol

    except Exception as e:
        print(f"AI protocol generation failed: {e}")
        # Fallback to structured minimal protocol based on hypothesis type
        return _generate_fallback_protocol(parsed, safety_flags)


def _generate_fallback_protocol(
    parsed: dict[str, Any], safety_flags: list[str]
) -> list[dict[str, Any]]:
    """
    Generate a minimal but structured fallback protocol based on domain.
    Better than static template - adapts to domain and safety.
    """
    domain = parsed.get("domain", "other")
    assay = parsed.get("assay_or_measurement", "")
    intervention = parsed.get("intervention", "")
    organism = parsed.get("organism_or_model", "")

    protocol = []

    # Step 1: Preparation (always needed)
    prep_duration = 180  # 3 hours default
    if "cell" in domain or "tissue" in domain:
        prep_duration = 480  # Cell culture prep takes longer
    if "animal" in domain or "mouse" in organism.lower():
        prep_duration = 240  # Animal prep

    protocol.append({
        "step_number": 1,
        "title": "Prepare materials and equipment",
        "description": f"Gather all required reagents for {intervention or 'intervention'}, calibrate equipment, and prepare workspace following safety protocols.",
        "duration_minutes": prep_duration,
        "critical_parameters": ["reagent integrity", "equipment calibration"],
        "equipment": ["standard lab equipment"],
        "expected_output": "Ready workspace and verified materials",
        "citations": [],
        "confidence": 0.7,
        "needs_review": True,
        "failure_modes": ["Contaminated reagents", "Equipment malfunction"],
        "qc_checks": ["Verify reagent expiration", "Run calibration controls"],
        "labor_skill_level": "standard",
        "consumables_cost_estimate": 50.0,
    })

    # Step 2: Baseline/Pretreatment
    baseline_duration = 120
    if assay:
        baseline_desc = f"Establish baseline measurements using {assay}."
    else:
        baseline_desc = "Establish baseline measurements for all primary and secondary endpoints."

    protocol.append({
        "step_number": 2,
        "title": "Establish baseline measurements",
        "description": baseline_desc,
        "duration_minutes": baseline_duration,
        "critical_parameters": ["baseline stability", "measurement accuracy"],
        "equipment": [assay.split()[0] if assay else "measurement equipment"],
        "expected_output": "Baseline data recorded",
        "citations": [],
        "confidence": 0.6,
        "needs_review": True,
        "failure_modes": ["High baseline variability"],
        "qc_checks": ["Validate measurements against standards"],
        "labor_skill_level": "standard",
        "consumables_cost_estimate": 100.0,
    })

    # Step 3: Intervention application
    intervention_duration = 60
    if "week" in parsed.get("duration", "").lower():
        intervention_duration = 120  # Complex interventions take longer

    protocol.append({
        "step_number": 3,
        "title": f"Apply {intervention or 'intervention'}",
        "description": f"Administer {intervention or 'treatment'} according to protocol specifications. Document all parameters.",
        "duration_minutes": intervention_duration,
        "critical_parameters": ["dose accuracy", "timing", "application method"],
        "equipment": ["administration equipment"],
        "expected_output": f"{intervention or 'Treatment'} applied and documented",
        "citations": [],
        "confidence": 0.5,
        "needs_review": True,
        "failure_modes": ["Incomplete application", "Contamination"],
        "qc_checks": ["Verify dosing calculations", "Confirm application completeness"],
        "labor_skill_level": "senior" if safety_flags else "standard",
        "consumables_cost_estimate": 200.0,
    })

    # Step 4: Observation/Measurement (main data collection)
    measure_duration = 240
    if assay and any(x in assay.lower() for x in ["imaging", "microscopy", "behavioral"]):
        measure_duration = 480  # These take longer

    protocol.append({
        "step_number": 4,
        "title": f"Measure outcomes using {assay or 'appropriate assays'}",
        "description": f"Collect primary outcome data ({parsed.get('primary_outcome', 'as specified')}) using {assay or 'validated methods'}. Include quality controls.",
        "duration_minutes": measure_duration,
        "critical_parameters": ["assay specificity", "detection limits", "timing"],
        "equipment": [assay.split()[0] if assay else "assay equipment"],
        "expected_output": "Raw data collected with QC metrics",
        "citations": [],
        "confidence": 0.6,
        "needs_review": True,
        "failure_modes": ["Assay failure", "Insufficient signal", "Contamination"],
        "qc_checks": ["Run positive controls", "Check signal-to-noise"],
        "labor_skill_level": "specialist" if assay and any(x in assay.lower() for x in ["mass spec", "sequencing", "electrophysiology"]) else "standard",
        "consumables_cost_estimate": 300.0,
    })

    # Step 5: Data analysis
    protocol.append({
        "step_number": 5,
        "title": "Analyze data and interpret results",
        "description": "Process raw data, perform statistical analysis, and interpret findings relative to hypotheses and controls.",
        "duration_minutes": 360,
        "critical_parameters": ["statistical power", "multiple comparison correction", "effect size"],
        "equipment": ["data analysis software"],
        "expected_output": "Analyzed data with statistical report",
        "citations": [],
        "confidence": 0.7,
        "needs_review": False,
        "failure_modes": ["Insufficient power", "Software errors"],
        "qc_checks": ["Validate statistical assumptions", "Check for outliers"],
        "labor_skill_level": "senior",
        "consumables_cost_estimate": 0.0,
    })

    return protocol


def generate_validation_criteria(
    hypothesis: str,
    parsed: dict[str, Any],
    references: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Generate validation criteria specific to the hypothesis.
    """
    sample_size = estimate_sample_size(hypothesis, parsed)

    context = {
        "hypothesis": hypothesis,
        "primary_outcome": parsed.get("primary_outcome", ""),
        "threshold": parsed.get("threshold", ""),
        "assay_or_measurement": parsed.get("assay_or_measurement", ""),
        "domain": parsed.get("domain", "other"),
        "sample_size": sample_size,
        "statistical_references": references[:3],
    }

    try:
        result = llm_gateway.generate_with_schema(
            prompt=VALIDATION_GENERATION_PROMPT,
            payload=context,
            schema=ValidationCriteria,
            system_message="You are a biostatistician. Define rigorous validation criteria.",
            temperature=0.3,
        )
        return result.model_dump()
    except Exception as e:
        print(f"AI validation generation failed: {e}")
        # Fallback
        return _generate_fallback_validation(parsed, sample_size)


def _generate_fallback_validation(
    parsed: dict[str, Any], sample_size: dict[str, Any]
) -> dict[str, Any]:
    """Generate fallback validation criteria based on hypothesis."""
    threshold = parsed.get("threshold", "")
    outcome = parsed.get("primary_outcome", "")

    # Default success criteria
    success_criteria = ["Statistically significant effect vs control (p < 0.05)"]
    if threshold:
        success_criteria.append(f"Effect meets threshold: {threshold}")

    failure_criteria = [
        "No statistically significant effect vs control",
        "Effect size < minimum detectable effect",
        "High dropout rate (>20%)",
        "Technical failures >15% of samples",
    ]

    return {
        "primary_endpoint": outcome or "Primary biological endpoint",
        "secondary_endpoints": [
            "Safety observations",
            "Mechanistic marker changes",
            "Exploratory biomarkers",
        ],
        "success_criteria": success_criteria,
        "failure_criteria": failure_criteria,
        "statistical_analysis": f"Two-sided hypothesis testing with alpha=0.05. N={sample_size['n_per_group']} per group provides {sample_size['power']*100:.0f}% power to detect {sample_size['effect_size_assumed']*100:.0f}% effect. Apply appropriate multiple comparison corrections.",
        "quality_controls": [
            "Negative control samples",
            "Positive control samples",
            "Assay calibration controls",
            "Batch effect monitoring",
        ],
        "stopping_rules": [
            "Early stopping if >50% effect achieved with p<0.01",
            "Stop for futility if no trend after 50% enrollment",
            "Stop for safety if adverse events exceed predefined threshold",
        ],
    }


def build_plan_title(hypothesis: str) -> str:
    """
    Generate a concise, descriptive title for an experiment plan.
    Uses AI when available, falls back to heuristic extraction.
    """
    try:
        prompt = """Generate a concise, descriptive title (3-7 words) for this experiment plan based on the hypothesis.
Rules:
- Keep it professional and scientific
- Include the key intervention and outcome
- Be specific but brief
- Don't use generic words like "Study" or "Research" unless necessary

Return ONLY the title text, nothing else."""

        title = llm_gateway.generate_text(
            prompt=prompt,
            payload={"hypothesis": hypothesis},
            system_message="You are a scientific experiment naming assistant. Generate clear, professional experiment titles.",
            temperature=0.3,
        )
        # Clean up the response
        title = title.strip().strip('"').strip("'")
        if len(title) > 5:
            return title
    except Exception as e:
        print(f"AI title generation failed, using fallback: {e}")

    # Deterministic fallback: extract key terms from hypothesis
    import re

    words = hypothesis.split()
    key_terms = []
    skip_words = {
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
        "will", "is", "are", "be", "been", "being", "have", "has", "had", "do", "does", "did",
        "can", "could", "may", "might", "must", "shall", "should", "would", "compared", "versus",
        "at", "least", "more", "less", "than", "by", "from", "using", "under", "after", "during",
    }

    for word in words[:25]:
        clean = re.sub(r"[^\w\s-]", "", word).lower()
        if clean and clean not in skip_words and len(clean) > 2:
            key_terms.append(word)
        if len(key_terms) >= 5:
            break

    if key_terms:
        return " ".join(key_terms[:6])

    return hypothesis[:60].strip()


# Legacy alias for backward compatibility
def generate_protocol_outline(parsed: dict[str, Any]) -> list[dict[str, Any]]:
    """Legacy protocol generation - now uses fallback as base."""
    return _generate_fallback_protocol(parsed, safety_flags=[])
