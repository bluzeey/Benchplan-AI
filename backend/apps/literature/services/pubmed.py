"""Bounded ESearch -> EFetch client. https://www.ncbi.nlm.nih.gov/books/NBK25499/"""

from __future__ import annotations

import json
import re
import time
from html import unescape
from threading import Lock
from typing import Any
from urllib.parse import unquote
from xml.etree import ElementTree

import httpx

MAX_RESULTS = 10
MAX_QUERY_CHARS = 2000
MAX_RESPONSE_BYTES = 2 * 1024 * 1024
RESPONSE_DEADLINE_SECONDS = 10.0
HTTP_TIMEOUT = httpx.Timeout(5.0, connect=3.0)
EUTILS_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
_request_lock = Lock()
_last_request_at = 0.0


def _valid_query(query: Any) -> bool:
    return (
        isinstance(query, str)
        and bool(query.strip())
        and len(query) <= MAX_QUERY_CHARS
        and not re.search(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", query)
    )


def _text(value: Any, limit: int = 2000) -> str:
    if not isinstance(value, str):
        return ""
    return " ".join(unescape(re.sub(r"<[^>]*>", "", value)).split())[:limit]


def _normalize_doi(value: Any) -> str:
    if not isinstance(value, str) or len(value) > 1024:
        return ""
    value = unquote(value.strip())
    value = re.sub(r"^(?:https?://(?:dx\.)?doi\.org/|doi:\s*)", "", value, flags=re.I).casefold()
    if len(value) > 255 or not re.fullmatch(r'10\.\d{4,9}/[^\s<>"\x00-\x1f\x7f]+', value):
        return ""
    # Exclude the old fixture identifiers, not the legitimate 10.1000 prefix.
    return "" if value.startswith("10.1000/example") else value


def _normalize_pmid(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    value = value.strip()
    return str(int(value)) if re.fullmatch(r"[0-9]{1,12}", value) and int(value) else ""


def _year(value: Any) -> int | None:
    if isinstance(value, bool) or not isinstance(value, (str, int)):
        return None
    match = re.match(r"^([12][0-9]{3})(?:\b|$)", str(value))
    return int(match[1]) if match else None


def _request_bytes(client: httpx.Client, url: str, data: dict[str, Any]) -> bytes:
    """POST keeps hypotheses out of HTTP request URLs/logs; never follow remote links."""
    started = time.monotonic()
    with client.stream("POST", url, data=data) as response:
        if response.status_code != 200:
            raise ValueError("Literature source unavailable")
        length = response.headers.get("content-length")
        if length is not None and (int(length) < 0 or int(length) > MAX_RESPONSE_BYTES):
            raise ValueError("Literature response exceeds limit")
        body = bytearray()
        for chunk in response.iter_bytes(chunk_size=65536):
            if time.monotonic() - started > RESPONSE_DEADLINE_SECONDS:
                raise ValueError("Literature response deadline exceeded")
            if len(body) + len(chunk) > MAX_RESPONSE_BYTES:
                raise ValueError("Literature response exceeds limit")
            body.extend(chunk)
        return bytes(body)


def _pubmed_request(client: httpx.Client, endpoint: str, data: dict[str, Any]) -> bytes:
    global _last_request_at
    # NCBI's unauthenticated limit is three requests/second per IP. This limiter
    # covers this process; multiple workers sharing an IP still share NCBI's quota.
    with _request_lock:
        delay = 0.35 - (time.monotonic() - _last_request_at)
        if delay > 0:
            time.sleep(delay)
        _last_request_at = time.monotonic()
    return _request_bytes(client, f"{EUTILS_URL}/{endpoint}.fcgi", {"tool": "benchplan", **data})


def _xml_text(node: ElementTree.Element, path: str) -> str:
    child = node.find(path)
    return "" if child is None else "".join(child.itertext())


def search_pubmed(query: str) -> list[dict[str, Any]]:
    """Return up to ten retrieved citations, or [] on empty/invalid/unavailable data.

    Two requests at most, one ESearch page and one batch EFetch. No retries,
    redirects, query rewriting, pagination, or synthetic fallback citations.
    """
    if not _valid_query(query):
        return []
    try:
        with httpx.Client(timeout=HTTP_TIMEOUT, follow_redirects=False, trust_env=False) as client:
            payload = json.loads(_pubmed_request(client, "esearch", {
                "db": "pubmed", "term": query, "retmode": "json",
                "retmax": MAX_RESULTS, "retstart": 0, "sort": "relevance",
            }))
            if not isinstance(payload, dict) or payload.get("error"):
                return []
            search = payload.get("esearchresult")
            if not isinstance(search, dict) or search.get("errorlist") or search.get("error"):
                return []
            ids = search.get("idlist")
            if not isinstance(ids, list):
                return []
            pmids = list(dict.fromkeys(pmid for value in ids[:MAX_RESULTS] if (pmid := _normalize_pmid(value))))
            if not pmids:
                return []
            raw = _pubmed_request(client, "efetch", {
                "db": "pubmed", "id": ",".join(pmids), "retmode": "xml", "rettype": "abstract",
            })

        # ElementTree does not load external DTDs. Reject internal entity/DTD
        # declarations (including UTF-16 input) before parsing untrusted XML.
        if b"\x00" in raw or re.search(br"<!\s*ENTITY|<!DOCTYPE[^>]*\[", raw, re.I):
            return []
        root = ElementTree.fromstring(raw)
        if root.tag != "PubmedArticleSet":
            return []
        by_pmid: dict[str, dict[str, Any]] = {}
        for article in root.findall("PubmedArticle")[:MAX_RESULTS]:
            pmid = _normalize_pmid(_xml_text(article, "MedlineCitation/PMID"))
            title = _text(_xml_text(article, "MedlineCitation/Article/ArticleTitle"))
            if pmid not in pmids or not title:
                continue
            doi = next((doi for identifier in article.findall("PubmedData/ArticleIdList/ArticleId")
                        if identifier.get("IdType") == "doi" and (doi := _normalize_doi(identifier.text))), "")
            date_path = "MedlineCitation/Article/Journal/JournalIssue/PubDate"
            year = _year(_xml_text(article, f"{date_path}/Year") or _xml_text(article, f"{date_path}/MedlineDate"))
            authors = []
            for author in article.findall("MedlineCitation/Article/AuthorList/Author")[:100]:
                name = _text(_xml_text(author, "CollectiveName") or " ".join(filter(None, (
                    _xml_text(author, "ForeName") or _xml_text(author, "Initials"), _xml_text(author, "LastName"),
                ))))
                if name:
                    authors.append(name)
            abstract = " ".join("".join(part.itertext()) for part in article.findall(
                "MedlineCitation/Article/Abstract/AbstractText"
            ))
            by_pmid.setdefault(pmid, {
                "source": "pubmed", "title": title, "year": year, "authors": authors,
                "abstract": _text(abstract, 12000), "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                "doi": doi, "pmid": pmid,
                "why_relevant": "Returned by PubMed for the submitted search; relevance has not been independently assessed.",
            })
        return [by_pmid[pmid] for pmid in pmids if pmid in by_pmid]
    except Exception:
        # Provider bodies/exception strings can contain private queries or credentials.
        return []
