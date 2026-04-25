def build_validation(parsed: dict) -> dict:
    return {
        "primary_endpoint": parsed.get("primary_outcome") or "Primary biological endpoint",
        "secondary_endpoints": ["Safety observations", "Mechanistic marker"],
        "success_criteria": ["Primary endpoint meets predefined effect threshold"],
        "failure_criteria": ["No statistically meaningful effect vs control"],
        "statistical_analysis": "Two-sided hypothesis testing with corrected multiple comparisons where applicable.",
        "quality_controls": ["Negative control", "Positive control", "Assay calibration controls"],
    }
