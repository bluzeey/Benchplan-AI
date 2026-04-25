from typing import Any


def search_pubmed(query: str) -> list[dict[str, Any]]:
    return [
        {
            "source": "pubmed",
            "title": "Lactobacillus rhamnosus GG effects on gut barrier function",
            "year": 2021,
            "url": "https://pubmed.ncbi.nlm.nih.gov/",
            "doi": "10.1000/example-doi",
            "pmid": "00000000",
            "why_relevant": f"Matches organism/intervention/assay terms from query: {query[:80]}",
        }
    ]
