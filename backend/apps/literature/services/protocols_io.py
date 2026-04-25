from typing import Any


def search_protocols_io(query: str) -> list[dict[str, Any]]:
    return [
        {
            "source": "protocols_io",
            "title": "Murine intestinal permeability protocol",
            "year": 2022,
            "url": "https://www.protocols.io/",
            "doi": "",
            "protocol_id": "stub-protocol",
            "why_relevant": f"Protocol candidate related to query: {query[:80]}",
        }
    ]
