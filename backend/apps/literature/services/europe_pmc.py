from typing import Any


def search_europe_pmc(query: str) -> list[dict[str, Any]]:
    return [
        {
            "source": "europe_pmc",
            "title": "FITC-dextran assay workflow for permeability studies",
            "year": 2019,
            "url": "https://europepmc.org/",
            "doi": "",
            "why_relevant": f"Protocol and assay similarity for query: {query[:80]}",
        }
    ]
