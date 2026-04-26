"""
AI-driven budget estimation.
Replaces static calculations with context-aware cost modeling.
"""
from __future__ import annotations

from decimal import Decimal
from typing import Any

from apps.agents.llm_gateway import llm_gateway
from apps.agents.prompts import BUDGET_ESTIMATION_V2_PROMPT
from apps.agents.schemas import BudgetEstimate, LaborLine, MaterialSpec
from apps.planning.services.web_search import search_labour_rates


# Regional labor rate defaults (USD/hour)
LABOR_RATES = {
    "US": {
        "junior": {"standard": 35.0, "min": 30.0, "max": 40.0},
        "standard": {"standard": 55.0, "min": 45.0, "max": 65.0},
        "senior": {"standard": 85.0, "min": 70.0, "max": 100.0},
        "specialist": {"standard": 120.0, "min": 100.0, "max": 150.0},
    },
    "EU": {
        "junior": {"standard": 28.0, "min": 25.0, "max": 32.0},
        "standard": {"standard": 45.0, "min": 38.0, "max": 52.0},
        "senior": {"standard": 70.0, "min": 58.0, "max": 82.0},
        "specialist": {"standard": 95.0, "min": 80.0, "max": 110.0},
    },
    "UK": {
        "junior": {"standard": 22.0, "min": 18.0, "max": 26.0},
        "standard": {"standard": 38.0, "min": 32.0, "max": 44.0},
        "senior": {"standard": 58.0, "min": 48.0, "max": 68.0},
        "specialist": {"standard": 80.0, "min": 65.0, "max": 95.0},
    },
    "default": {
        "junior": {"standard": 30.0, "min": 25.0, "max": 35.0},
        "standard": {"standard": 50.0, "min": 40.0, "max": 60.0},
        "senior": {"standard": 75.0, "min": 60.0, "max": 90.0},
        "specialist": {"standard": 110.0, "min": 90.0, "max": 130.0},
    },
}


def get_labor_rate(skill_level: str, region: str = "US") -> dict[str, float]:
    """Get labor rate for skill level and region."""
    region_rates = LABOR_RATES.get(region, LABOR_RATES["default"])
    return region_rates.get(skill_level, region_rates["standard"])


def estimate_budget_v2(
    hypothesis: str,
    parsed: dict[str, Any],
    protocol: list[dict[str, Any]],
    materials: list[dict[str, Any]],
    region: str = "US",
) -> dict[str, Any]:
    """
    Generate a context-aware budget estimate using AI.
    """
    # Calculate labor hours from protocol
    labor_by_skill = {"junior": 0, "standard": 0, "senior": 0, "specialist": 0}
    for step in protocol:
        skill = step.get("labor_skill_level", "standard")
        duration = step.get("duration_minutes", 0)
        labor_by_skill[skill] += duration / 60.0  # Convert to hours

    # Add 20% overhead for setup, documentation, troubleshooting
    for skill in labor_by_skill:
        labor_by_skill[skill] *= 1.2

    # Get labor rate research
    labor_rates_research = search_labour_rates(region)

    # Calculate complexity-based contingency
    complexity = parsed.get("complexity_score", 0.5)
    uncertainty = parsed.get("uncertainty_level", "medium")
    if uncertainty == "low":
        contingency_low, contingency_high = 0.10, 0.15
    elif uncertainty == "high":
        contingency_low, contingency_high = 0.25, 0.35
    else:
        contingency_low, contingency_high = 0.15, 0.25

    # Adjust for complexity
    if complexity > 0.7:
        contingency_high += 0.05

    context = {
        "hypothesis": hypothesis,
        "domain": parsed.get("domain", "other"),
        "protocol_steps": protocol,
        "materials": materials,
        "labor_rates": {
            "by_skill": labor_by_skill,
            "hourly_rates": LABOR_RATES.get(region, LABOR_RATES["default"]),
            "research": labor_rates_research,
        },
        "similar_studies": [],  # Could be populated
        "complexity_score": complexity,
        "uncertainty_level": uncertainty,
        "region": region,
        "contingency_rates": {"low": contingency_low, "high": contingency_high},
    }

    try:
        result = llm_gateway.generate_with_schema(
            prompt=BUDGET_ESTIMATION_V2_PROMPT,
            payload=context,
            schema=BudgetEstimate,
            system_message="You are a research operations financial analyst. Create realistic budget estimates.",
            temperature=0.3,
        )

        budget = result.model_dump()

        # Ensure numeric fields are proper Decimals for DB storage
        budget = _convert_to_decimals(budget)

        return budget

    except Exception as e:
        print(f"AI budget estimation failed: {e}")
        return _generate_fallback_budget(materials, labor_by_skill, contingency_low, contingency_high, region)


def _generate_fallback_budget(
    materials: list[dict[str, Any]],
    labor_by_skill: dict[str, float],
    contingency_low: float,
    contingency_high: float,
    region: str,
) -> dict[str, Any]:
    """Generate a structured fallback budget using calculated labor hours."""
    # Convert materials to proper format
    materials_list = []
    materials_min = 0.0
    materials_max = 0.0

    for m in materials:
        total_min = float(m.get("estimated_total_cost_min", m.get("estimated_total_cost", 0)) or 0)
        total_max = float(m.get("estimated_total_cost_max", m.get("estimated_total_cost", 0)) or 0)
        materials_min += total_min
        materials_max += total_max

        materials_list.append({
            "name": m.get("name", "Unknown"),
            "category": m.get("category", "reagents"),
            "role": m.get("role", ""),
            "supplier": m.get("supplier", ""),
            "catalog_number": m.get("catalog_number", ""),
            "catalog_source_url": m.get("catalog_source_url", ""),
            "quantity": m.get("quantity", ""),
            "estimated_unit_cost": m.get("estimated_unit_cost", 0),
            "estimated_unit_cost_min": m.get("estimated_unit_cost_min", m.get("estimated_unit_cost", 0)),
            "estimated_unit_cost_max": m.get("estimated_unit_cost_max", m.get("estimated_unit_cost", 0)),
            "estimated_total_cost": m.get("estimated_total_cost", 0),
            "estimated_total_cost_min": total_min,
            "estimated_total_cost_max": total_max,
            "lead_time_days_min": m.get("lead_time_days_min", 7),
            "lead_time_days_max": m.get("lead_time_days_max", 21),
            "storage_conditions": m.get("storage_conditions", ""),
            "confidence": m.get("confidence", 0.5),
            "needs_supplier_verification": m.get("needs_supplier_verification", True),
            "alternative_suppliers": m.get("alternative_suppliers", []),
            "cost_drivers": m.get("cost_drivers", []),
        })

    # Calculate labor lines from protocol-derived hours
    labor_list = []
    labor_min = 0.0
    labor_max = 0.0

    for skill, hours in labor_by_skill.items():
        if hours < 1:  # Skip negligible hours
            continue

        rates = get_labor_rate(skill, region)
        rate_min = rates["min"]
        rate_max = rates["max"]
        rate_std = rates["standard"]

        # Add 20% buffer for overhead/meetings
        hours_min = hours * 0.9  # Optimistic
        hours_max = hours * 1.2  # With troubleshooting

        total_min = hours_min * rate_min
        total_max = hours_max * rate_max

        labor_min += total_min
        labor_max += total_max

        role_map = {
            "junior": "Research Assistant",
            "standard": "Research Associate",
            "senior": "Senior Scientist",
            "specialist": "Specialist Technician",
        }

        labor_list.append({
            "role": role_map.get(skill, "Research Staff"),
            "skill_level": skill,
            "hours_min": hours_min,
            "hours_max": hours_max,
            "hourly_rate": rate_std,
            "hourly_rate_min": rate_min,
            "hourly_rate_max": rate_max,
            "total_cost_min": total_min,
            "total_cost_max": total_max,
            "assumptions": f"Hours calculated from protocol step durations. Rate for {region} region.",
            "confidence": 0.6 if skill == "specialist" else 0.7,
        })

    # If no labor calculated (shouldn't happen), add default
    if not labor_list:
        labor_list.append({
            "role": "Research Associate",
            "skill_level": "standard",
            "hours_min": 64.0,
            "hours_max": 96.0,
            "hourly_rate": LABOR_RATES.get(region, LABOR_RATES["default"])["standard"]["standard"],
            "hourly_rate_min": LABOR_RATES.get(region, LABOR_RATES["default"])["standard"]["min"],
            "hourly_rate_max": LABOR_RATES.get(region, LABOR_RATES["default"])["standard"]["max"],
            "total_cost_min": 64.0 * LABOR_RATES.get(region, LABOR_RATES["default"])["standard"]["min"],
            "total_cost_max": 96.0 * LABOR_RATES.get(region, LABOR_RATES["default"])["standard"]["max"],
            "assumptions": "Default estimate. Recalculate after protocol finalization.",
            "confidence": 0.5,
        })
        labor_min = labor_list[0]["total_cost_min"]
        labor_max = labor_list[0]["total_cost_max"]

    # Subtotals
    subtotal_min = materials_min + labor_min
    subtotal_max = materials_max + labor_max

    # Contingency
    contingency_min_val = subtotal_min * contingency_low
    contingency_max_val = subtotal_max * contingency_high

    # Totals
    total_min = subtotal_min + contingency_min_val
    total_max = subtotal_max + contingency_max_val

    # Identify cost drivers
    cost_drivers = []
    if materials_max > labor_max * 1.5:
        cost_drivers.append("Materials dominate budget - consider optimizing reagent selection")
    if labor_max > materials_max * 1.5:
        cost_drivers.append("Labor dominates budget - consider automation or protocol optimization")

    # Category breakdown for display
    category_totals = {}
    for m in materials_list:
        cat = m["category"]
        if cat not in category_totals:
            category_totals[cat] = {"min": 0, "max": 0}
        category_totals[cat]["min"] += m["estimated_total_cost_min"]
        category_totals[cat]["max"] += m["estimated_total_cost_max"]

    for cat, totals in category_totals.items():
        if totals["max"] > total_max * 0.2:  # If >20% of budget
            cost_drivers.append(f"{cat} accounts for {(totals['max']/total_max)*100:.0f}% of budget")

    return {
        "materials": materials_list,
        "labor": labor_list,
        "equipment_use": [],
        "other_costs": [],
        "subtotal_min": subtotal_min,
        "subtotal_max": subtotal_max,
        "contingency_min": contingency_min_val,
        "contingency_max": contingency_max_val,
        "total_min": total_min,
        "total_max": total_max,
        "confidence": 0.65,
        "primary_cost_drivers": cost_drivers if cost_drivers else ["Materials and labor equally weighted"],
        "cost_saving_opportunities": [
            "Obtain vendor quotes to narrow price ranges",
            "Consider bulk purchasing for repeated experiments",
            "Evaluate if all assay replicates are necessary",
        ],
        "budget_assumptions": [
            "Labor calculated from protocol step durations",
            "Material costs use estimated ranges with uncertainty",
            f"Contingency set at {contingency_low*100:.0f}%-{contingency_high*100:.0f}% based on uncertainty",
            f"Labor rates for {region} region",
        ],
    }


def _convert_to_decimals(obj: Any) -> Any:
    """Recursively convert float values to Decimal for database compatibility."""
    if isinstance(obj, float):
        return Decimal(str(obj))
    if isinstance(obj, dict):
        return {k: _convert_to_decimals(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_convert_to_decimals(item) for item in obj]
    return obj


# Legacy compatibility
estimate_budget = estimate_budget_v2
