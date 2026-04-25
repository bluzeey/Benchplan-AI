from __future__ import annotations

import os
from typing import Any

from .europe_pmc import search_europe_pmc
from .openalex import search_openalex
from .protocols_io import search_protocols_io
from .pubmed import search_pubmed
from .semantic_scholar import search_semantic_scholar


def build_queries(hypothesis: str) -> list[str]:
    return [
        hypothesis,
        f"{hypothesis} protocol",
        f"{hypothesis} assay",
        f"{hypothesis} comparator control",
        f"{hypothesis} mechanism",
        f"{hypothesis} review",
    ]


def run_literature_search(hypothesis: str) -> tuple[list[str], list[dict[str, Any]]]:
    queries = build_queries(hypothesis)
    collected: list[dict[str, Any]] = []
    semantic_key_present = bool(os.getenv("SEMANTIC_SCHOLAR_API_KEY", "").strip())

    for query in queries[:2]:
        collected.extend(search_pubmed(query))

        semantic_results: list[dict[str, Any]] = []
        if semantic_key_present:
            try:
                semantic_results = search_semantic_scholar(query)
            except Exception:
                semantic_results = []

        if semantic_results:
            collected.extend(semantic_results)
        else:
            try:
                collected.extend(search_openalex(query))
            except Exception:
                pass

        collected.extend(search_europe_pmc(query))
        collected.extend(search_protocols_io(query))

    deduped: list[dict[str, Any]] = []
    seen = set()
    for row in collected:
        key = (row.get("source"), row.get("title"))
        if key in seen:
            continue
        seen.add(key)
        deduped.append(row)
    return queries, deduped[:3]
