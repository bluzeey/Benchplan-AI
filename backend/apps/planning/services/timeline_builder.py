def default_timeline() -> list[dict]:
    return [
        {"phase_number": 1, "title": "Literature/protocol finalization", "start_week": 1, "end_week": 1, "dependencies": [], "parallelizable": False, "risk_of_delay": "Protocol ambiguity", "mitigation": "PI sign-off gate"},
        {"phase_number": 2, "title": "Procurement", "start_week": 1, "end_week": 3, "dependencies": [1], "parallelizable": True, "risk_of_delay": "Supplier lead times", "mitigation": "Dual vendor options"},
        {"phase_number": 3, "title": "Pilot setup", "start_week": 3, "end_week": 4, "dependencies": [2], "parallelizable": False, "risk_of_delay": "Assay calibration", "mitigation": "Pilot acceptance criteria"},
        {"phase_number": 4, "title": "Main experiment", "start_week": 4, "end_week": 7, "dependencies": [3], "parallelizable": False, "risk_of_delay": "Biological variance", "mitigation": "Reserve cohort"},
        {"phase_number": 5, "title": "Assay/measurement", "start_week": 6, "end_week": 8, "dependencies": [4], "parallelizable": True, "risk_of_delay": "Instrument downtime", "mitigation": "Backup instrument"},
        {"phase_number": 6, "title": "Analysis", "start_week": 8, "end_week": 9, "dependencies": [5], "parallelizable": False, "risk_of_delay": "Data quality", "mitigation": "QC checklist"},
        {"phase_number": 7, "title": "Validation/repeat", "start_week": 9, "end_week": 10, "dependencies": [6], "parallelizable": False, "risk_of_delay": "Inconclusive results", "mitigation": "Predefined repeat criteria"},
        {"phase_number": 8, "title": "Report/proposal package", "start_week": 10, "end_week": 10, "dependencies": [7], "parallelizable": False, "risk_of_delay": "Review backlog", "mitigation": "Template-based report"},
    ]
