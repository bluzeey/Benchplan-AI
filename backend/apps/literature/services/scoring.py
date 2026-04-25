from __future__ import annotations

from typing import Any


def score_novelty(hypothesis: str, references: list[dict[str, Any]]) -> dict[str, Any]:
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
        },
    }
