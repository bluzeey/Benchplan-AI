"""
Web search service for fetching real-time research data.
Uses Serper API or similar for Google search results.
"""
from __future__ import annotations

import os
from typing import Any

import httpx


SERPER_API_KEY = os.getenv("SERPER_API_KEY", "")
SERPER_BASE_URL = "https://google.serper.dev"


def search_reagent_costs(reagent_name: str, quantity_hint: str = "") -> list[dict[str, Any]]:
    """
    Search for real-time reagent costs from suppliers.
    Returns list of price estimates with sources.
    """
    if not SERPER_API_KEY:
        return []

    query = f"{reagent_name} price cost supplier"
    if quantity_hint:
        query += f" {quantity_hint}"

    try:
        response = httpx.post(
            f"{SERPER_BASE_URL}/search",
            headers={"X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json"},
            json={"q": query, "num": 5},
            timeout=15.0,
        )
        response.raise_for_status()
        data = response.json()

        results = []
        for result in data.get("organic", [])[:3]:
            results.append({
                "source": result.get("link", ""),
                "title": result.get("title", ""),
                "snippet": result.get("snippet", ""),
                "search_query": query,
            })
        return results
    except Exception as e:
        print(f"Reagent cost search failed: {e}")
        return []


def search_protocol_details(assay_name: str, organism: str = "") -> list[dict[str, Any]]:
    """
    Search for protocol details, durations, and best practices.
    """
    if not SERPER_API_KEY:
        return []

    query = f"{assay_name} protocol protocol steps duration"
    if organism:
        query += f" {organism}"

    try:
        response = httpx.post(
            f"{SERPER_BASE_URL}/search",
            headers={"X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json"},
            json={"q": query, "num": 5},
            timeout=15.0,
        )
        response.raise_for_status()
        data = response.json()

        results = []
        for result in data.get("organic", [])[:3]:
            results.append({
                "source": result.get("link", ""),
                "title": result.get("title", ""),
                "snippet": result.get("snippet", ""),
                "search_query": query,
            })
        return results
    except Exception as e:
        print(f"Protocol search failed: {e}")
        return []


def search_equipment_costs(equipment_name: str) -> list[dict[str, Any]]:
    """
    Search for equipment rental/purchase costs.
    """
    if not SERPER_API_KEY:
        return []

    query = f"{equipment_name} rental cost per hour pricing"

    try:
        response = httpx.post(
            f"{SERPER_BASE_URL}/search",
            headers={"X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json"},
            json={"q": query, "num": 5},
            timeout=15.0,
        )
        response.raise_for_status()
        data = response.json()

        results = []
        for result in data.get("organic", [])[:3]:
            results.append({
                "source": result.get("link", ""),
                "title": result.get("title", ""),
                "snippet": result.get("snippet", ""),
                "search_query": query,
            })
        return results
    except Exception as e:
        print(f"Equipment cost search failed: {e}")
        return []


def search_labour_rates(region: str = "US") -> dict[str, Any]:
    """
    Search for current research staff labor rates.
    """
    if not SERPER_API_KEY:
        return {}

    query = f"research associate salary hourly rate {region} 2024"

    try:
        response = httpx.post(
            f"{SERPER_BASE_URL}/search",
            headers={"X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json"},
            json={"q": query, "num": 3},
            timeout=15.0,
        )
        response.raise_for_status()
        data = response.json()

        snippets = []
        for result in data.get("organic", [])[:3]:
            snippets.append({
                "source": result.get("link", ""),
                "snippet": result.get("snippet", ""),
            })
        return {"search_query": query, "sources": snippets}
    except Exception as e:
        print(f"Labor rate search failed: {e}")
        return {}


def search_lead_times(material_name: str) -> list[dict[str, Any]]:
    """
    Search for typical lead times for specific materials.
    """
    if not SERPER_API_KEY:
        return []

    query = f"{material_name} delivery time lead time shipping"

    try:
        response = httpx.post(
            f"{SERPER_BASE_URL}/search",
            headers={"X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json"},
            json={"q": query, "num": 3},
            timeout=15.0,
        )
        response.raise_for_status()
        data = response.json()

        results = []
        for result in data.get("organic", [])[:3]:
            results.append({
                "source": result.get("link", ""),
                "title": result.get("title", ""),
                "snippet": result.get("snippet", ""),
                "search_query": query,
            })
        return results
    except Exception as e:
        print(f"Lead time search failed: {e}")
        return []


def search_competitor_studies(hypothesis: str, domain: str = "") -> list[dict[str, Any]]:
    """
    Search for similar published studies to benchmark timelines and budgets.
    """
    if not SERPER_API_KEY:
        return []

    # Extract key terms from hypothesis
    key_terms = hypothesis.split()[:10]  # First 10 words
    query = " ".join(key_terms) + " study duration weeks cost budget"
    if domain:
        query += f" {domain}"

    try:
        response = httpx.post(
            f"{SERPER_BASE_URL}/search",
            headers={"X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json"},
            json={"q": query, "num": 5},
            timeout=15.0,
        )
        response.raise_for_status()
        data = response.json()

        results = []
        for result in data.get("organic", [])[:5]:
            results.append({
                "source": result.get("link", ""),
                "title": result.get("title", ""),
                "snippet": result.get("snippet", ""),
                "search_query": query,
            })
        return results
    except Exception as e:
        print(f"Competitor study search failed: {e}")
        return []
