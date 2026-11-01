"""Project ownership is the authorization boundary, including legacy records."""

from django.db.models import F, Q

from apps.projects.models import ExperimentQuestion, Project


def owned_projects(user):
    if not user.is_authenticated:
        return Project.objects.none()
    return Project.objects.filter(owner=user)


def owned_questions(user):
    return ExperimentQuestion.objects.filter(project__in=owned_projects(user))


def owned_qc_runs(user):
    from apps.literature.models import LiteratureQcRun

    return LiteratureQcRun.objects.filter(question__in=owned_questions(user))


def owned_plans(user):
    from apps.planning.models import ExperimentPlan

    # Fail closed if old rows contain inconsistent project/question/QC links.
    return ExperimentPlan.objects.filter(
        project__in=owned_projects(user), question__project_id=F("project_id")
    ).filter(Q(qc_run__isnull=True) | Q(qc_run__question_id=F("question_id")))


def owned_reviews(user):
    from apps.feedback.models import ReviewSession

    return ReviewSession.objects.filter(plan__in=owned_plans(user))
