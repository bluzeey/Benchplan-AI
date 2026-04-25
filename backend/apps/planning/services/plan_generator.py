from typing import Any


def build_plan_title(hypothesis: str) -> str:
    return f"Plan: {hypothesis[:80]}"


def generate_protocol_outline(parsed: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        {
            "step_number": 1,
            "title": "Finalize protocol and approvals",
            "description": "Confirm protocol scope, controls, and required safety reviews before procurement.",
            "duration_minutes": 180,
            "critical_parameters": ["approved protocol", "defined controls"],
            "equipment": ["documentation system"],
            "expected_output": "Signed planning package",
            "citations": [],
            "confidence": 0.72,
            "needs_review": True,
        },
        {
            "step_number": 2,
            "title": "Run pilot and calibrate assay",
            "description": "Execute pilot measurements to establish baseline variability and assay dynamic range.",
            "duration_minutes": 480,
            "critical_parameters": [parsed.get("assay_or_measurement") or "assay conditions"],
            "equipment": ["assay workstation"],
            "expected_output": "Pilot QC report",
            "citations": [],
            "confidence": 0.68,
            "needs_review": True,
        },
        {
            "step_number": 3,
            "title": "Execute main experiment and analyze",
            "description": "Run full cohorts, capture endpoints, and perform predefined statistical analysis.",
            "duration_minutes": 14400,
            "critical_parameters": [parsed.get("duration") or "study duration"],
            "equipment": ["data analysis tools"],
            "expected_output": "Result set and interpretation",
            "citations": [],
            "confidence": 0.66,
            "needs_review": True,
        },
    ]
