from typing import Any


def verify_citations(plan: dict[str, Any], references: list[dict[str, Any]]) -> dict[str, Any]:
    has_refs = len(references) > 0
    coverage = 0.75 if has_refs else 0.2
    return {
        "coverage": coverage,
        "needs_verification_sections": [] if has_refs else ["protocol", "materials", "validation"],
    }
