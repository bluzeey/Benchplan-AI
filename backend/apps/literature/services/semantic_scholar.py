from typing import Any


def search_semantic_scholar(query: str) -> list[dict[str, Any]]:
    return [
        {
            "source": "semantic_scholar",
            "title": "Probiotic modulation of intestinal permeability in murine models",
            "year": 2020,
            "url": "https://www.semanticscholar.org/",
            "doi": "",
            "why_relevant": f"Query overlap with intervention and outcome: {query[:80]}",
        }
    ]
