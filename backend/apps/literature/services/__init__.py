from __future__ import annotations

import os
import re
import unicodedata
from typing import Any, Callable
from urllib.parse import urlsplit, urlunsplit

from .europe_pmc import search_europe_pmc
from .openalex import search_openalex
from .protocols_io import search_protocols_io
from .pubmed import MAX_RESULTS, _normalize_doi, _normalize_pmid, _text, _valid_query, _year, search_pubmed
from .semantic_scholar import search_semantic_scholar

MAX_SEARCH_QUERIES = 4
MAX_AGGREGATE_RESULTS = 100
SUPPORTED_SOURCES = frozenset({"pubmed", "europe_pmc", "openalex", "semantic_scholar"})


def build_queries(hypothesis: str) -> list[str]:
    return [
        hypothesis,
        f"{hypothesis} protocol",
        f"{hypothesis} assay",
        f"{hypothesis} comparator control",
        f"{hypothesis} mechanism",
        f"{hypothesis} review",
    ]


def _citation_url(value: Any) -> str:
    if not isinstance(value, str) or len(value) > 2000 or re.search(r"[\s\x00-\x1f\x7f]", value):
        return ""
    try:
        parts = urlsplit(value)
        if (parts.scheme not in {"http", "https"} or not parts.hostname
                or parts.username is not None or parts.password is not None
                or not parts.path.strip("/")):
            return ""
        return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), parts.path.rstrip("/"), parts.query, ""))
    except ValueError:
        return ""


def _validated_reference(row: Any, expected_source: str | None = None) -> dict[str, Any] | None:
    """Require real citation metadata; never supply a placeholder title/source."""
    if not isinstance(row, dict):
        return None
    source = row.get("source")
    if not isinstance(source, str) or source not in SUPPORTED_SOURCES or (expected_source and source != expected_source):
        return None
    title = _text(row.get("title"))
    doi, pmid = _normalize_doi(row.get("doi")), _normalize_pmid(row.get("pmid"))
    url = _citation_url(row.get("url"))
    if not title or title.casefold() == "untitled" or not (doi or pmid or url):
        return None
    # Do not let known fixture identifiers become evidence through a generic URL.
    raw_doi = row.get("doi")
    if isinstance(raw_doi, str) and "10.1000/example" in raw_doi.casefold():
        return None
    authors = row.get("authors", [])
    authors = authors if isinstance(authors, list) else []
    return {
        "source": source, "title": title, "year": _year(row.get("year")),
        "doi": doi, "pmid": pmid, "url": url,
        "authors": [name for author in authors[:100] if (name := _text(author))],
        "abstract": _text(row.get("abstract"), 12000),
        "why_relevant": "Returned by the named literature source for the submitted search; relevance requires review.",
    }


def _safe_search(search: Callable[[str], list[dict[str, Any]]], query: str, source: str) -> list[dict[str, Any]]:
    try:
        rows = search(query)
        if not isinstance(rows, list):
            return []
        return [ref for row in rows[:MAX_RESULTS] if (ref := _validated_reference(row, source)) is not None]
    except Exception:
        # Never emit exception content, query text, request URLs, or API keys.
        return []


def _deduplicate(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Union aliases so a DOI/PMID bridge collapses earlier duplicate groups."""
    parents = list(range(len(rows)))
    group_values = [{field: {row[field]} if row.get(field) else set()
                     for field in ("doi", "pmid", "year")} for row in rows]
    aliases: dict[tuple[str, str], int] = {}
    titles: dict[str, list[int]] = {}

    def root(index: int) -> int:
        while parents[index] != index:
            parents[index] = parents[parents[index]]
            index = parents[index]
        return index

    def union(first: int, second: int) -> None:
        first, second = root(first), root(second)
        survivor, merged = min(first, second), max(first, second)
        parents[merged] = survivor
        for field in ("doi", "pmid", "year"):
            group_values[survivor][field].update(group_values[merged][field])

    for index, row in enumerate(rows):
        for field in ("doi", "pmid", "url"):
            value = row.get(field)
            if value:
                key = (field, value)
                if key in aliases:
                    union(index, aliases[key])
                aliases[key] = index
        title = re.sub(r"[\W_]+", "", unicodedata.normalize("NFKC", row["title"]).casefold())
        for previous in titles.get(title, []):
            # Title fallback tolerates missing years/IDs, but never collapses
            # explicitly different DOIs, PMIDs, or publication years.
            first, second = group_values[root(index)], group_values[root(previous)]
            if any(first[field] and second[field] and len(first[field] | second[field]) > 1
                   for field in ("doi", "pmid", "year")):
                continue
            union(index, previous)
        titles.setdefault(title, []).append(index)

    deduped: dict[int, dict[str, Any]] = {}
    for index, row in enumerate(rows):
        group = root(index)
        if group not in deduped:
            deduped[group] = dict(row)
        else:
            # Fill missing metadata only with values actually returned for the citation.
            for field in ("doi", "pmid", "year", "authors", "abstract", "url"):
                if not deduped[group].get(field) and row.get(field):
                    deduped[group][field] = row[field]
    return list(deduped.values())


def run_literature_search(hypothesis: str, max_results: int = 10) -> tuple[list[str], list[dict[str, Any]]]:
    queries = build_queries(hypothesis)
    if not _valid_query(hypothesis) or not isinstance(max_results, int) or isinstance(max_results, bool) or max_results <= 0:
        return queries, []
    limit = min(max_results, MAX_AGGREGATE_RESULTS)
    collected: list[dict[str, Any]] = []
    semantic_key_present = bool(os.getenv("SEMANTIC_SCHOLAR_API_KEY", "").strip())

    # Four deterministic query variants, ten rows/source/query; no pagination
    # or retry loops. Retain the existing authenticated Semantic Scholar/OpenAlex
    # fallback, each isolated from outages in every other source.
    for query in queries[:MAX_SEARCH_QUERIES]:
        if not _valid_query(query):
            continue
        collected.extend(_safe_search(search_pubmed, query, "pubmed"))
        semantic_results = _safe_search(search_semantic_scholar, query, "semantic_scholar") if semantic_key_present else []
        collected.extend(semantic_results or _safe_search(search_openalex, query, "openalex"))
        collected.extend(_safe_search(search_europe_pmc, query, "europe_pmc"))
        # Currently unsupported; this public function deliberately returns [].
        collected.extend(_safe_search(search_protocols_io, query, "protocols_io"))

    return queries, _deduplicate(collected)[:limit]
