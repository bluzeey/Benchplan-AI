from typing import Any


def build_plan_title(hypothesis: str) -> str:
    """
    Generate a concise, descriptive title for an experiment plan based on the hypothesis.
    Uses AI when available, falls back to a heuristic extraction when LLM is unavailable.
    """
    try:
        from apps.agents.llm_gateway import llm_gateway

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
        # Fallback to heuristic extraction
        print(f"AI title generation failed, using fallback: {e}")

    # Deterministic fallback: extract key terms from hypothesis
    import re

    # Remove common filler words and extract key terms
    words = hypothesis.split()
    key_terms = []
    skip_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
                  "will", "is", "are", "be", "been", "being", "have", "has", "had", "do", "does", "did",
                  "can", "could", "may", "might", "must", "shall", "should", "would", "compared", "versus",
                  "at", "least", "more", "less", "than", "by", "from", "using", "under", "after", "during"}

    for word in words[:25]:  # Look at first 25 words
        # Clean punctuation
        clean = re.sub(r'[^\w\s-]', '', word).lower()
        if clean and clean not in skip_words and len(clean) > 2:
            key_terms.append(word)
        if len(key_terms) >= 5:
            break

    if key_terms:
        return " ".join(key_terms[:6])

    return hypothesis[:60].strip()


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
