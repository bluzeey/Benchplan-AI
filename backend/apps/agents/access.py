"""Authorize existing JSON-linked runs without adding an ownership column."""

from uuid import UUID

from django.http import Http404

from apps.common.access import owned_plans, owned_qc_runs

from .models import AgentRun


def owned_agent_run(user, run_id):
    run = AgentRun.objects.filter(pk=run_id).first()
    if run is None or run.run_type not in {"literature_qc", "plan_generation"}:
        raise Http404
    payload = run.input_payload
    required = ["question_id", "qc_run_id"]
    if run.run_type == "plan_generation":
        required.append("plan_id")
    try:
        targets = {key: UUID(payload[key]) for key in required}
        # Optional target identifiers must also agree; never expose a mixed run.
        for key in ("question_id", "qc_run_id", "plan_id"):
            if key in payload:
                targets[key] = UUID(payload[key])
    except (TypeError, ValueError, KeyError, AttributeError):
        raise Http404 from None
    qc_run = owned_qc_runs(user).filter(pk=targets["qc_run_id"]).first()
    if qc_run is None or qc_run.question_id != targets["question_id"]:
        raise Http404
    if "plan_id" in targets:
        plan = owned_plans(user).filter(pk=targets["plan_id"]).first()
        if plan is None or plan.qc_run_id != qc_run.id or plan.question_id != qc_run.question_id:
            raise Http404
    if not isinstance(run.output_payload, dict):
        raise Http404
    for key in ("question_id", "qc_run_id", "plan_id"):
        if key in run.output_payload and str(run.output_payload[key]) != str(targets.get(key)):
            raise Http404
    return run
