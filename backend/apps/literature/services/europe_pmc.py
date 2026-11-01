"""Europe PMC REST searchPOST client. https://europepmc.org/RestfulWebService"""

from __future__ import annotations

import json
import re
from typing import Any
from urllib.parse import quote

import httpx

from .pubmed import HTTP_TIMEOUT, MAX_RESULTS, _normalize_doi, _normalize_pmid, _request_bytes, _text, _valid_query, _year

SEARCH_URL = "https://www.ebi.ac.uk/europepmc/webservices/rest/searchPOST"
# Documented data-source codes, including preprints and Bookshelf metadata.
EUROPE_PMC_SOURCES = frozenset({"AGR", "CBA", "CIT", "CTX", "ETH", "HIR", "MED", "NBK", "PAT", "PMC", "PPR"})


def search_europe_pmc(query: str) -> list[dict[str, Any]]:
    """Fetch one core-metadata page; failure/empty results return [], never fixtures."""
    if not _valid_query(query):
        return []
    try:
        with httpx.Client(timeout=HTTP_TIMEOUT, follow_redirects=False, trust_env=False) as client:
            payload = json.loads(_request_bytes(client, SEARCH_URL, {
                "query": query, "format": "json", "resultType": "core",
                "pageSize": MAX_RESULTS, "cursorMark": "*", "synonym": "false",
            }))
        if not isinstance(payload, dict) or payload.get("error") or payload.get("errMsg"):
            return []
        result_list = payload.get("resultList")
        if not isinstance(result_list, dict) or not isinstance(result_list.get("result"), list):
            return []
        results = []
        seen = set()
        for paper in result_list["result"][:MAX_RESULTS]:
            if not isinstance(paper, dict):
                continue
            title = _text(paper.get("title"))
            source, identifier = paper.get("source"), paper.get("id")
            if (not title or not isinstance(source, str) or source not in EUROPE_PMC_SOURCES
                    or not isinstance(identifier, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}", identifier)):
                continue
            pmid = _normalize_pmid(identifier if source == "MED" else paper.get("pmid"))
            if source == "MED" and not pmid:
                continue
            key = (source, identifier)
            if key in seen:
                continue
            seen.add(key)
            author_list = paper.get("authorList")
            authors = author_list.get("author", []) if isinstance(author_list, dict) else []
            authors = authors if isinstance(authors, list) else []
            results.append({
                "source": "europe_pmc", "title": title, "year": _year(paper.get("pubYear")),
                "authors": [name for author in authors[:100] if isinstance(author, dict)
                            and (name := _text(author.get("fullName") or author.get("collectiveName")))],
                "abstract": _text(paper.get("abstractText"), 12000),
                "url": f"https://europepmc.org/article/{source}/{quote(identifier, safe='')}",
                "doi": _normalize_doi(paper.get("doi")), "pmid": pmid,
                "why_relevant": "Returned by Europe PMC for the submitted search; relevance has not been independently assessed.",
            })
        return results
    except Exception:
        return []
