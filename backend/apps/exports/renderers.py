from apps.planning.models import ExperimentPlan


def render_plan_markdown(plan: ExperimentPlan) -> str:
    lines = [
        f"# {plan.title}",
        "",
        "## Executive Summary",
        plan.executive_summary or "",
        "",
        "## Assumptions",
    ]
    for assumption in plan.plan_json.get("assumptions", []):
        lines.append(f"- {assumption}")
    lines.append("")
    lines.append("## References")
    for ref in plan.plan_json.get("references", []):
        lines.append(f"- {ref.get('title', 'Reference')} ({ref.get('source', '')})")
    return "\n".join(lines)
