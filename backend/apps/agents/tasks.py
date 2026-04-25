from celery import shared_task

from .models import AgentRun
from .registry import generate_plan_from_qc, run_literature_qc


@shared_task
def run_literature_qc_task(qc_run_id: str, agent_run_id: str) -> str:
    try:
        run_literature_qc(qc_run_id, agent_run_id)
    except Exception as exc:
        run = AgentRun.objects.get(id=agent_run_id)
        run.status = "failed"
        run.error_message = str(exc)
        run.save(update_fields=["status", "error_message", "updated_at"])
        raise
    return qc_run_id


@shared_task
def generate_plan_task(qc_run_id: str, agent_run_id: str) -> str:
    try:
        plan = generate_plan_from_qc(qc_run_id, agent_run_id)
    except Exception as exc:
        run = AgentRun.objects.get(id=agent_run_id)
        run.status = "failed"
        run.error_message = str(exc)
        run.save(update_fields=["status", "error_message", "updated_at"])
        raise
    return str(plan.id)
