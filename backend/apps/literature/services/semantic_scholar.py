from __future__ import annotations

import os
from typing import Any

import httpx


def search_semantic_scholar(query: str) -> list[dict[str, Any]]:
    api_key = os.getenv("SEMANTIC_SCHOLAR_API_KEY", "").strip()
    if not api_key:
        return []

    url = "https://api.semanticscholar.org/graph/v1/paper/search"
    headers = {"x-api-key": api_key}
    params = {
        "query": query,
        "limit": 5,
        "fields": "title,year,url,externalIds,abstract",
    }
    response = httpx.get(url, headers=headers, params=params, timeout=15.0)
    response.raise_for_status()

    payload = response.json()
    papers = payload.get("data", [])
    results: list[dict[str, Any]] = []
    for paper in papers:
        external_ids = paper.get("externalIds", {}) or {}
        results.append(
            {
                "source": "semantic_scholar",
                "title": paper.get("title") or "Untitled",
                "year": paper.get("year"),
                "url": paper.get("url") or "",
                "doi": external_ids.get("DOI", ""),
                "pmid": external_ids.get("PubMed", ""),
                "why_relevant": f"Semantic Scholar lexical/semantic match for query: {query[:80]}",
            }
        )
    return results
