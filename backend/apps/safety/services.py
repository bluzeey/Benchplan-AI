from apps.agents.llm_gateway import llm_gateway
from apps.agents.prompts import SAFETY_TRIAGE_PROMPT
from .policies import UI_SAFETY_WARNING


def triage_hypothesis(raw_text: str) -> dict:
    """
    Analyze hypothesis for safety concerns and regulatory requirements using LLM.

    Uses Fireworks AI (Kimi K2.5 Turbo) to provide nuanced safety assessment
    beyond simple keyword matching.
    """
    try:
        # Use LLM for safety triage with structured output
        result = llm_gateway.generate_json(
            prompt=SAFETY_TRIAGE_PROMPT,
            payload={"hypothesis": raw_text},
            system_message="You are a laboratory safety and regulatory compliance expert. Analyze research proposals for potential hazards and required approvals.",
            temperature=0.2,
        )

        # Ensure required fields exist with defaults
        return {
            "state": result.get("state", "clear_for_planning"),
            "categories": result.get("categories", []),
            "required_approvals": result.get("required_approvals", []),
            "missing_information": result.get("missing_information", []),
            "warning": UI_SAFETY_WARNING,
        }

    except Exception as e:
        # Fallback to keyword-based triage if LLM fails
        print(f"LLM safety triage failed, using fallback: {e}")
        text = raw_text.lower()
        categories = []
        required_approvals = []
        state = "clear_for_planning"

        if any(token in text for token in ["mouse", "mice", "rat", "animal"]):
            categories.append("animal_research")
            required_approvals.append("IACUC or equivalent animal ethics review")
            state = "requires_institutional_review"
        if any(token in text for token in ["human", "patient", "clinical", "blood"]):
            categories.append("human_subjects")
            required_approvals.append("IRB or equivalent human subjects review")
            state = "requires_institutional_review"
        if any(token in text for token in ["recombinant", "plasmid", "crispr"]):
            categories.append("recombinant_or_synthetic_nucleic_acids")
            required_approvals.append("Institutional biosafety committee review")
            state = "requires_institutional_review"
        if any(token in text for token in ["toxin", "pathogen", "infectious"]):
            categories.append("infectious_agent")
            required_approvals.append("Biosafety officer review")
            state = "blocked_pending_manual_review"
        if any(token in text for token in ["acid", "solvent", "hazardous chemical"]):
            categories.append("hazardous_chemical")

        return {
            "state": state,
            "categories": categories,
            "required_approvals": required_approvals,
            "missing_information": [] if categories else ["Biosafety level and protocol context not provided"],
            "warning": UI_SAFETY_WARNING,
        }
