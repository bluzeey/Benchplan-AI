from types import SimpleNamespace
from uuid import uuid4

import pytest
from django.apps import apps
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from apps.agents.models import AgentEvent, AgentRun
from apps.feedback.models import FeedbackExample, ReviewAnnotation, ReviewSession
from apps.feedback.services import create_feedback_example_from_annotation, retrieve_similar_feedback
from apps.literature.models import LiteratureQcRun, Reference
from apps.planning.models import (
    BudgetLine, ExperimentPlan, Material, PlanSection, ProtocolStep, TimelinePhase,
)
from apps.projects.models import ExperimentQuestion, Project, ProjectAttachment
from apps.safety.models import SafetyAssessment


@pytest.fixture
def records(db):
    user_model = get_user_model()
    owner = user_model.objects.create_user(username="owner", email="owner@example.invalid", password="test-password")
    other = user_model.objects.create_user(username="other", email="other@example.invalid", password="test-password")

    def graph(user, label):
        project = Project.objects.create(owner=user, title=f"{label} project")
        question = ExperimentQuestion.objects.create(project=project, raw_text=f"{label} private research hypothesis")
        qc = LiteratureQcRun.objects.create(question=question, status="completed", summary=f"{label} QC")
        reference = Reference.objects.create(qc_run=qc, title=f"{label} reference", source="offline")
        plan = ExperimentPlan.objects.create(project=project, question=question, qc_run=qc, title=f"{label} plan")
        section = PlanSection.objects.create(plan=plan, key="protocol", title=f"{label} section")
        step = ProtocolStep.objects.create(plan=plan, step_number=1, title=f"{label} step", description="Private")
        material = Material.objects.create(plan=plan, name=f"{label} material", category="test")
        budget = BudgetLine.objects.create(plan=plan, category="test", label=f"{label} budget")
        timeline = TimelinePhase.objects.create(plan=plan, phase_number=1, title=f"{label} timeline", start_week=1, end_week=2)
        # Reviewer identity alone must never grant access to another owner's plan.
        review = ReviewSession.objects.create(plan=plan, reviewer=owner)
        annotation = ReviewAnnotation.objects.create(
            review_session=review, section_key="protocol", correction_type="correction",
            corrected_text=f"{label} correction", severity="high",
        )
        example = create_feedback_example_from_annotation(annotation)
        safety = SafetyAssessment.objects.create(question=question, warning=f"{label} safety")
        attachment = ProjectAttachment.objects.create(
            project=project, name=f"{label} attachment", object_key=f"{label}/file",
            url=f"https://storage.invalid/{label}/file",
        )
        qc_agent = AgentRun.objects.create(run_type="literature_qc", input_payload={
            "question_id": str(question.id), "qc_run_id": str(qc.id),
        }, output_payload={"qc_run_id": str(qc.id)})
        plan_agent = AgentRun.objects.create(run_type="plan_generation", input_payload={
            "question_id": str(question.id), "qc_run_id": str(qc.id), "plan_id": str(plan.id),
        }, output_payload={"plan_id": str(plan.id)})
        for run in (qc_agent, plan_agent):
            AgentEvent.objects.create(run=run, label=f"{label} private progress", payload={"private": label})
        return SimpleNamespace(**locals())

    return SimpleNamespace(owner=owner, other=other, own=graph(owner, "own"),
                           foreign=graph(other, "foreign"), legacy=graph(None, "legacy"))


def url(name, graph, **links):
    return reverse(name, kwargs={key: getattr(graph, attr).id for key, attr in links.items()})


READS = [
    ("project-detail", {"pk": "project"}),
    ("question-detail", {"question_id": "question"}),
    ("project-attachment-list", {"project_id": "project"}),
    ("literature-qc-detail", {"qc_run_id": "qc"}),
    ("literature-references", {"qc_run_id": "qc"}),
    ("plan-detail", {"plan_id": "plan"}),
    ("plan-sections", {"plan_id": "plan"}),
    ("plan-materials", {"plan_id": "plan"}),
    ("plan-budget", {"plan_id": "plan"}),
    ("plan-timeline", {"plan_id": "plan"}),
    ("export-markdown", {"plan_id": "plan"}),
    ("export-materials-csv", {"plan_id": "plan"}),
    ("export-budget-csv", {"plan_id": "plan"}),
    ("agent-run-detail", {"run_id": "qc_agent"}),
    ("agent-run-events", {"run_id": "qc_agent"}),
    ("agent-run-detail", {"run_id": "plan_agent"}),
    ("agent-run-events", {"run_id": "plan_agent"}),
    ("review-detail", {"review_id": "review"}),
]


def missing_graph(links):
    return SimpleNamespace(**{attr: SimpleNamespace(id=uuid4()) for attr in links.values()})


@pytest.mark.parametrize("name,links", READS)
@pytest.mark.parametrize("access", ["anonymous", "own", "foreign", "legacy", "missing"])
def test_object_reads(records, name, links, access):
    client = APIClient()
    if access != "anonymous":
        client.force_authenticate(records.owner)
    graph = (missing_graph(links) if access == "missing" else
             records.own if access == "anonymous" else getattr(records, access))
    response = client.get(url(name, graph, **links))
    expected = 403 if access == "anonymous" else 200 if access == "own" else 404
    assert response.status_code == expected, response.content
    if name.startswith("agent-run") and expected == 404:
        assert response.json() == {"detail": "Not found."}
    if access == "own":
        assert b"own" in response.content or str(records.own.plan.id).encode() in response.content
        assert b"foreign" not in response.content and b"legacy" not in response.content


@pytest.mark.parametrize("name,attr", [
    ("project-list", "project"), ("plan-list", "plan"), ("review-list", "review"),
    ("feedback-examples", "example"), ("safety-assessment-list", "safety"),
])
def test_lists_only_include_owned_records(records, name, attr):
    client = APIClient()
    assert client.get(reverse(name)).status_code == 403
    client.force_authenticate(records.owner)
    response = client.get(reverse(name))
    assert response.status_code == 200
    assert [row["id"] for row in response.json()] == [str(getattr(records.own, attr).id)]
    client.force_authenticate(records.other)
    assert [row["id"] for row in client.get(reverse(name)).json()] == [str(getattr(records.foreign, attr).id)]


MUTATIONS = [
    ("post", "project-question-create", {"project_id": "project"}, {"raw_text": "New private question"}),
    ("post", "literature-qc-create", {"question_id": "question"}, {}),
    ("post", "literature-qc-retry", {"qc_run_id": "qc"}, {}),
    ("post", "generate-plan", {"qc_run_id": "qc"}, {}),
    ("patch", "plan-section-patch", {"plan_id": "plan", "section_id": "section"}, {"content_markdown": "changed"}),
    ("put", "plan-section-patch", {"plan_id": "plan", "section_id": "section"}, {"key": "protocol", "title": "changed"}),
    ("post", "review-create", {"plan_id": "plan"}, {}),
    ("post", "annotation-create", {"review_id": "review"}, {"section_key": "protocol", "correction_type": "test", "corrected_text": "changed", "severity": "high"}),
    ("patch", "annotation-update", {"review_id": "review", "annotation_id": "annotation"}, {"corrected_text": "changed"}),
    ("put", "annotation-update", {"review_id": "review", "annotation_id": "annotation"}, {"section_key": "protocol", "correction_type": "test", "corrected_text": "changed", "severity": "high"}),
    ("post", "review-complete", {"review_id": "review"}, {"overall_rating": 5}),
    ("delete", "project-attachment-delete", {"attachment_id": "attachment"}, {}),
]


def snapshot():
    return {
        model._meta.label: list(model.objects.order_by("pk").values())
        for model in apps.get_models() if model._meta.app_label in {
            "projects", "literature", "planning", "agents", "feedback", "safety",
        }
    }


def assert_no_external_calls(external_calls):
    for mock in vars(external_calls).values():
        mock.assert_not_called()


@pytest.mark.parametrize("method,name,links,payload", MUTATIONS)
@pytest.mark.parametrize("access", ["anonymous", "foreign", "legacy", "missing"])
def test_denied_mutations_leave_all_rows_and_external_boundaries_untouched(
    records, external_calls, method, name, links, payload, access,
):
    client = APIClient()
    if access != "anonymous":
        client.force_authenticate(records.owner)
    graph = (missing_graph(links) if access == "missing" else
             records.own if access == "anonymous" else getattr(records, access))
    before = snapshot()
    response = getattr(client, method)(url(name, graph, **links), payload, format="json")
    assert response.status_code == (403 if access == "anonymous" else 404), response.content
    assert snapshot() == before
    assert_no_external_calls(external_calls)


@pytest.mark.parametrize("method,name,links,payload", MUTATIONS)
def test_owner_can_use_mutation_endpoints(records, external_calls, method, name, links, payload):
    client = APIClient()
    client.force_authenticate(records.owner)
    response = getattr(client, method)(url(name, records.own, **links), payload, format="json")
    expected = (204 if method == "delete" else 202 if name in {
        "literature-qc-create", "literature-qc-retry", "generate-plan",
    } else 201 if name in {"project-question-create", "review-create", "annotation-create"} else 200)
    assert response.status_code == expected, response.content
    if name in {"literature-qc-create", "literature-qc-retry"}:
        external_calls.run_literature_qc_task.assert_called_once_with(
            response.json()["qc_run_id"], response.json()["agent_run_id"],
        )
        qc = LiteratureQcRun.objects.get(pk=response.json()["qc_run_id"])
        assert qc.question_id == records.own.question.id and qc.status == "running"
    elif name == "generate-plan":
        data = response.json()
        external_calls.plan_title.assert_called_once_with(records.own.question.raw_text)
        external_calls.generate_plan_task.assert_called_once_with(
            str(records.own.qc.id), data["agent_run_id"], data["plan_id"],
        )
        assert ExperimentPlan.objects.get(pk=data["plan_id"]).project_id == records.own.project.id
    elif name == "project-question-create":
        assert ExperimentQuestion.objects.get(pk=response.json()["id"]).project_id == records.own.project.id
    elif name == "plan-section-patch":
        records.own.section.refresh_from_db()
        assert getattr(records.own.section, "content_markdown" if method == "patch" else "title") == "changed"
    elif name == "review-create":
        review = ReviewSession.objects.get(pk=response.json()["id"])
        assert review.plan_id == records.own.plan.id and review.reviewer == records.owner
    elif name == "annotation-create":
        annotation = ReviewAnnotation.objects.get(pk=response.json()["id"])
        assert annotation.review_session_id == records.own.review.id
        assert FeedbackExample.objects.filter(source_annotation=annotation).exists()
    elif name == "annotation-update":
        records.own.annotation.refresh_from_db()
        assert records.own.annotation.corrected_text == "changed"
    elif name == "review-complete":
        records.own.review.refresh_from_db()
        assert records.own.review.status == "completed" and records.own.review.overall_rating == 5
    elif method == "delete":
        assert not ProjectAttachment.objects.filter(pk=records.own.attachment.id).exists()


def test_project_creation_requires_login_and_binds_owner_before_title_provider(records, external_calls):
    client = APIClient()
    payload = {"hypothesis": "A synthetic private hypothesis with a measurable endpoint over four weeks.",
               "owner": records.other.id}
    before = snapshot()
    assert client.post(reverse("project-list"), payload, format="json").status_code == 403
    assert snapshot() == before
    assert_no_external_calls(external_calls)
    client.force_authenticate(records.owner)
    external_calls.generate_text.side_effect = None
    external_calls.generate_text.return_value = "Offline generated title"
    response = client.post(reverse("project-list"), payload, format="json")
    assert response.status_code == 201, response.content
    project = Project.objects.get(pk=response.json()["id"])
    assert project.owner == records.owner and project.title == "Offline generated title"
    external_calls.generate_text.assert_called_once()
    records.legacy.project.refresh_from_db()
    assert records.legacy.project.owner_id is None


def test_relationship_fields_cannot_reparent_questions_or_annotations(records):
    client = APIClient()
    client.force_authenticate(records.owner)
    response = client.post(url("project-question-create", records.own, project_id="project"), {
        "raw_text": "New question", "project": str(records.foreign.project.id),
    }, format="json")
    assert response.status_code == 201
    assert response.json()["project"] == str(records.own.project.id)
    response = client.patch(url("annotation-update", records.own, review_id="review", annotation_id="annotation"), {
        "review_session": str(records.foreign.review.id), "corrected_text": "Safe correction",
    }, format="json")
    assert response.status_code == 200
    records.own.annotation.refresh_from_db()
    assert records.own.annotation.review_session_id == records.own.review.id
    response = client.post(url("annotation-create", records.own, review_id="review"), {
        "review_session": str(records.foreign.review.id), "section_key": "test", "correction_type": "test",
        "corrected_text": "Safe correction", "severity": "high",
    }, format="json")
    assert response.status_code == 201
    assert response.json()["review_session"] == str(records.own.review.id)


@pytest.mark.parametrize("child_scope", ["own", "foreign", "legacy"])
def test_nested_mutations_require_matching_parent(records, external_calls, child_scope):
    client = APIClient()
    client.force_authenticate(records.owner)
    child = getattr(records, child_scope)
    parent_plan = ExperimentPlan.objects.create(
        project=records.own.project, question=records.own.question, title="Other owned plan",
    )
    parent_review = ReviewSession.objects.create(plan=parent_plan, reviewer=records.owner)
    before = snapshot()
    response = client.patch(reverse("plan-section-patch", kwargs={
        "plan_id": parent_plan.id, "section_id": child.section.id,
    }), {"content_markdown": "changed"}, format="json")
    assert response.status_code == 404
    response = client.patch(reverse("annotation-update", kwargs={
        "review_id": parent_review.id, "annotation_id": child.annotation.id,
    }), {"corrected_text": "changed"}, format="json")
    assert response.status_code == 404
    assert snapshot() == before
    assert_no_external_calls(external_calls)


@pytest.mark.parametrize("payload", [{}, None, [], {"question_id": "bad", "qc_run_id": "bad"}])
def test_unlinked_or_malformed_agent_runs_are_hidden(records, payload):
    run = AgentRun.objects.create(run_type="literature_qc", input_payload=payload if payload is not None else "legacy")
    client = APIClient()
    client.force_authenticate(records.owner)
    for name in ("agent-run-detail", "agent-run-events"):
        assert client.get(reverse(name, kwargs={"run_id": run.id})).status_code == 404


@pytest.mark.parametrize("mixed", ["question", "qc", "plan", "output", "missing-plan", "unknown-type"])
def test_inconsistent_agent_links_are_hidden(records, mixed):
    run = records.own.plan_agent
    if mixed in {"question", "qc", "plan"}:
        key = {"question": "question_id", "qc": "qc_run_id", "plan": "plan_id"}[mixed]
        run.input_payload[key] = str(getattr(records.foreign, mixed).id)
    elif mixed == "output":
        run.output_payload["plan_id"] = str(records.foreign.plan.id)
    elif mixed == "missing-plan":
        run.input_payload.pop("plan_id")
    else:
        run.run_type = "unknown"
    run.save()
    client = APIClient()
    client.force_authenticate(records.owner)
    for name in ("agent-run-detail", "agent-run-events"):
        assert client.get(reverse(name, kwargs={"run_id": run.id})).status_code == 404


def test_generation_feedback_is_private_to_project_owner(records):
    assert list(retrieve_similar_feedback("other", owner_id=records.owner.id)) == [records.own.example]
    assert list(retrieve_similar_feedback("other", owner_id=records.other.id)) == [records.foreign.example]
    assert list(retrieve_similar_feedback("other", owner_id=None)) == []
    records.own.example.approved_for_reuse = False
    records.own.example.save()
    assert list(retrieve_similar_feedback("other", owner_id=records.owner.id)) == []


@pytest.mark.parametrize("broken_link", ["question", "qc_run"])
def test_inconsistent_plan_relations_do_not_expose_other_project_data(records, broken_link):
    plan = records.own.plan
    setattr(plan, broken_link, records.foreign.question if broken_link == "question" else records.foreign.qc)
    plan.save()
    client = APIClient()
    client.force_authenticate(records.owner)
    for name in ("plan-detail", "plan-sections", "plan-materials", "plan-budget", "plan-timeline",
                 "export-markdown", "export-materials-csv", "export-budget-csv"):
        assert client.get(reverse(name, kwargs={"plan_id": plan.id})).status_code == 404
    for name in ("plan-list", "review-list", "feedback-examples"):
        assert client.get(reverse(name)).json() == []
    assert list(retrieve_similar_feedback("other", owner_id=records.owner.id)) == []


def test_plan_without_qc_link_remains_available_to_owner(records):
    records.own.plan.qc_run = None
    records.own.plan.save()
    client = APIClient()
    client.force_authenticate(records.owner)
    assert client.get(url("plan-detail", records.own, plan_id="plan")).status_code == 200
    client.force_authenticate(records.other)
    assert client.get(url("plan-detail", records.own, plan_id="plan")).status_code == 404


def test_legacy_project_is_never_claimed_and_empty_lists_are_private(records):
    third = get_user_model().objects.create_user(username="third", email="third@example.invalid")
    client = APIClient()
    client.force_authenticate(third)
    for name in ("project-list", "plan-list", "review-list", "feedback-examples", "safety-assessment-list"):
        response = client.get(reverse(name))
        assert response.status_code == 200 and response.json() == []
    assert client.get(url("project-detail", records.legacy, pk="project")).status_code == 404
    records.legacy.project.refresh_from_db()
    assert records.legacy.project.owner_id is None


def test_uploads_require_login_before_storage_client(records, external_calls):
    client = APIClient()
    payload = {"filename": "offline.txt", "size": 2}
    assert client.post(reverse("upload-presign"), payload, format="json").status_code == 403
    external_calls.storage.assert_not_called()
    client.force_authenticate(records.owner)
    external_calls.storage.return_value.generate_presigned_url.return_value = "https://storage.invalid/upload"
    response = client.post(reverse("upload-presign"), payload, format="json")
    assert response.status_code == 200
    assert response.json()["object_key"].startswith(f"uploads/{records.owner.id}/")


def test_public_health_csrf_signup_login_and_authenticated_logout(records, external_calls):
    client = APIClient(enforce_csrf_checks=True)
    assert client.get(reverse("health")).json() == {"status": "ok"}
    token = client.get(reverse("csrf-token")).json()["csrfToken"]
    assert token
    assert client.get("/api/auth/me/").status_code == 403
    assert client.post("/api/auth/logout/").status_code == 403
    response = client.post("/api/auth/signup/", {
        "email": "new@example.invalid", "first_name": "Test", "last_name": "User",
        "password": "test-password", "password_confirm": "test-password",
    }, format="json", HTTP_X_CSRFTOKEN=token)
    assert response.status_code == 201, response.content
    assert client.get("/api/auth/me/").json()["email"] == "new@example.invalid"
    token = client.get(reverse("csrf-token")).json()["csrfToken"]
    assert client.post("/api/auth/logout/", HTTP_X_CSRFTOKEN=token).status_code == 200
    assert client.get("/api/auth/me/").status_code == 403
    token = client.get(reverse("csrf-token")).json()["csrfToken"]
    assert client.post("/api/auth/login/", {
        "email": records.owner.email, "password": "test-password",
    }, format="json", HTTP_X_CSRFTOKEN=token).status_code == 200
    before = snapshot()
    path = url("plan-section-patch", records.own, plan_id="plan", section_id="section")
    assert client.patch(path, {"content_markdown": "CSRF blocked"}, format="json").status_code == 403
    assert snapshot() == before
    token = client.get(reverse("csrf-token")).json()["csrfToken"]
    assert client.patch(path, {"content_markdown": "CSRF accepted"}, format="json", HTTP_X_CSRFTOKEN=token).status_code == 200
    assert_no_external_calls(external_calls)


@pytest.mark.parametrize("path", ["/api/", "/api/schema/", "/api/docs/"])
def test_api_discovery_requires_login(path):
    assert APIClient().get(path).status_code == 403
