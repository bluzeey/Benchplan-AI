from .policies import UI_SAFETY_WARNING


def triage_hypothesis(raw_text: str) -> dict:
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
