from decimal import Decimal
from typing import Any


def estimate_budget(materials: list[dict[str, Any]], hourly_rate: Decimal = Decimal("75")) -> dict[str, Any]:
    subtotal = Decimal("0")
    for item in materials:
        subtotal += Decimal(str(item.get("estimated_total_cost") or 0))
    labor_hours = Decimal("80")
    labor = labor_hours * hourly_rate
    contingency_low = subtotal * Decimal("0.10")
    contingency_high = subtotal * Decimal("0.20")
    total_min = subtotal + labor + contingency_low
    total_max = subtotal + labor + contingency_high
    return {
        "subtotal": subtotal,
        "labor": labor,
        "contingency_low": contingency_low,
        "contingency_high": contingency_high,
        "total_min": total_min,
        "total_max": total_max,
    }
