from __future__ import annotations

import os
from typing import Any

import httpx


def _normalize_doi(value: str) -> str:
    if not value:
        return ""
    value = value.strip()
    if value.startswith("https://doi.org/"):
        return value.replace("https://doi.org/", "", 1)
    if value.startswith("http://doi.org/"):
        return value.replace("http://doi.org/", "", 1)
    return value


def _extract_pmid(ids: dict[str, Any]) -> str:
    pmid_url = (ids or {}).get("pmid", "")
    if not pmid_url:
        return ""
    return pmid_url.rstrip("/").split("/")[-1]


def search_openalex(query: str) -> list[dict[str, Any]]:
    base_url = os.getenv("OPENALEX_BASE_URL", "https://api.openalex.org").rstrip("/")
    mailto = os.getenv("OPENALEX_MAILTO", "").strip()

    params = {
        "search": query,
        "per-page": 5,
        "select": "id,display_name,publication_year,doi,ids,primary_location",
    }
    if mailto:
        params["mailto"] = mailto

    response = httpx.get(f"{base_url}/works", params=params, timeout=15.0)
    response.raise_for_status()
    payload = response.json()

    results: list[dict[str, Any]] = []
    for work in payload.get("results", []):
        ids = work.get("ids", {}) or {}
        primary_location = work.get("primary_location", {}) or {}
        landing_url = primary_location.get("landing_page_url") or work.get("id") or ""
        results.append(
            {
                "source": "openalex",
                "title": work.get("display_name") or "Untitled",
                "year": work.get("publication_year"),
                "url": landing_url,
                "doi": _normalize_doi(work.get("doi") or ids.get("doi") or ""),
                "pmid": _extract_pmid(ids),
                "why_relevant": f"OpenAlex fallback match for query terms: {query[:80]}",
            }
        )
    return results
