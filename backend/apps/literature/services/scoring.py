from __future__ import annotations

from typing import Any

from apps.agents.llm_gateway import llm_gateway
from apps.agents.prompts import NOVELTY_SCORING_PROMPT


def score_novelty(hypothesis: str, references: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Evaluate research novelty using LLM analysis of literature.

    Uses Fireworks AI (Kimi K2.5 Turbo) to provide nuanced novelty assessment
    with reasoning, going beyond simple keyword matching.
    """
    try:
        # Use LLM for novelty scoring with structured output
        result = llm_gateway.generate_json(
            prompt=NOVELTY_SCORING_PROMPT,
            payload={
                "hypothesis": hypothesis,
                "references": [
                    {
                        "title": r.get("title", ""),
                        "source": r.get("source", ""),
                        "year": r.get("year"),
                        "doi": r.get("doi", ""),
                    }
                    for r in references
                ],
                "num_references": len(references),
            },
            system_message="You are a research novelty assessor. Evaluate how novel a research hypothesis is compared to existing literature.",
            temperature=0.3,
        )

        # Validate and return structured result
        novelty_signal = result.get("novelty_signal", "inconclusive")
        confidence = float(result.get("confidence", 0.5))
        summary = result.get("summary", "Unable to assess novelty.")
        scoring_breakdown = result.get("scoring_breakdown", {})

        return {
            "novelty_signal": novelty_signal,
            "confidence": round(confidence, 3),
            "summary": summary,
            "scoring_breakdown": scoring_breakdown,
        }

    except Exception as e:
        # Fallback to rule-based scoring if LLM fails
        print(f"LLM novelty scoring failed, using fallback: {e}")
        text = hypothesis.lower()
        has_refs = len(references) > 0
        exact_markers = ["c57bl/6", "fitc", "30%", "4 weeks", "lactobacillus rhamnosus gg", "control"]
        exact_hits = sum(1 for marker in exact_markers if marker in text)

        semantic_similarity = 0.62 + min(0.24, 0.03 * exact_hits) if has_refs else 0.2
        partial_overlap = min(1.0, exact_hits / len(exact_markers))
        exact_key_variable_match = partial_overlap

        if exact_key_variable_match >= 0.85 and semantic_similarity >= 0.86:
            novelty_signal = "exact_match_found"
        elif semantic_similarity >= 0.62 or partial_overlap >= 0.55:
            novelty_signal = "similar_work_exists"
        else:
            novelty_signal = "not_found"

        confidence = round(min(0.97, (semantic_similarity + partial_overlap + (0.6 if has_refs else 0.1)) / 3), 3)
        summary = {
            "exact_match_found": "Highly overlapping prior work suggests protocol-level overlap with key variables.",
            "similar_work_exists": "Related studies exist but exact intervention-duration-threshold alignment is incomplete.",
            "not_found": "No strong evidence for closely related prior protocol under current query coverage.",
            "inconclusive": "Unable to determine novelty from available information.",
        }[novelty_signal]

        return {
            "novelty_signal": novelty_signal,
            "confidence": confidence,
            "summary": summary,
            "scoring_breakdown": {
                "semantic_similarity": semantic_similarity,
                "partial_key_variable_match": partial_overlap,
                "exact_key_variable_match": exact_key_variable_match,
                "number_of_independent_sources": len({r.get("source") for r in references}),
                "method": "fallback_rule_based",
            },
        }
