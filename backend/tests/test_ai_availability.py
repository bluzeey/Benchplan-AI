import json
import os
import subprocess
import sys
from types import SimpleNamespace
from unittest.mock import Mock, patch
from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from pydantic import BaseModel
from rest_framework.test import APIClient

from apps.agents.availability import (
    AI_UNAVAILABLE_MESSAGE, AiUnavailable, get_ai_config, is_ai_available,
)
from apps.agents.llm_gateway import LlmGateway
from apps.agents.models import AgentEvent, AgentRun
from apps.literature.models import LiteratureQcRun
from apps.planning.models import ExperimentPlan
from apps.projects.models import ExperimentQuestion, Project


@pytest.fixture(autouse=True)
def provider_settings(settings):
    settings.AI_ENABLED = True
    settings.AI_PROVIDER = "openrouter"
    settings.OPENROUTER_API_KEY = "synthetic-openrouter-key"
    settings.OPENROUTER_MODEL = "moonshotai/kimi-k2.5"
    # A configured second provider must never mask the selected provider's state.
    settings.FIREWORKS_API_KEY = "synthetic-fireworks-key"
    settings.FIREWORKS_MODEL = "synthetic-fireworks-model"
    return settings


@pytest.fixture
def records(db):
    owner = get_user_model().objects.create_user(username="ai-owner", email="ai-owner@example.invalid")
    other = get_user_model().objects.create_user(username="ai-other", email="ai-other@example.invalid")

    def graph(user):
        project = Project.objects.create(owner=user, title="Private research")
        question = ExperimentQuestion.objects.create(project=project, raw_text="Private hypothesis")
        qc = LiteratureQcRun.objects.create(
            question=question, status="completed", summary="Private findings",
            started_at=timezone.now(), completed_at=timezone.now(),
        )
        return SimpleNamespace(question=question, qc=qc)

    client = APIClient()
    client.force_authenticate(owner)
    return SimpleNamespace(
        owner=owner, client=client, own=graph(owner), foreign=graph(other), legacy=graph(None),
    )


JOBS = [
    ("literature-qc-create", "question_id", "question"),
    ("literature-qc-retry", "qc_run_id", "qc"),
    ("generate-plan", "qc_run_id", "qc"),
]
UNAVAILABLE = [
    {"OPENROUTER_API_KEY": ""},
    {"OPENROUTER_API_KEY": " \n "},
    {"OPENROUTER_MODEL": ""},
    {"OPENROUTER_MODEL": " \n "},
    {"AI_ENABLED": False},
    {"AI_PROVIDER": ""},
    {"AI_PROVIDER": "unsupported-provider"},
]


def job_url(job, graph):
    name, parameter, record = job
    return reverse(name, kwargs={parameter: getattr(graph, record).pk})


def job_state():
    return {
        model: list(model.objects.order_by("pk").values())
        for model in (Project, ExperimentQuestion, LiteratureQcRun, ExperimentPlan, AgentRun, AgentEvent)
    }


def apply_settings(settings, values):
    for name, value in values.items():
        setattr(settings, name, value)


@pytest.mark.parametrize("job", JOBS)
@pytest.mark.parametrize("unavailable", UNAVAILABLE)
def test_unavailable_blocks_jobs_before_any_side_effect(
    records, provider_settings, external_calls, job, unavailable,
):
    apply_settings(provider_settings, unavailable)
    before = job_state()
    with patch("apps.agents.llm_gateway.OpenAI") as constructor:
        response = records.client.post(job_url(job, records.own), {}, format="json")
    assert response.status_code == 503
    assert response.json() == {"detail": AI_UNAVAILABLE_MESSAGE}
    assert job_state() == before
    constructor.assert_not_called()
    for boundary in vars(external_calls).values():
        boundary.assert_not_called()


@pytest.mark.parametrize("job", JOBS)
@pytest.mark.parametrize("access", ["foreign", "legacy", "missing"])
def test_owner_lookup_precedes_unavailable_check(
    records, provider_settings, external_calls, job, access,
):
    provider_settings.OPENROUTER_API_KEY = ""
    graph = (SimpleNamespace(question=SimpleNamespace(pk=uuid4()), qc=SimpleNamespace(pk=uuid4()))
             if access == "missing" else getattr(records, access))
    view_module = "planning" if job[0] == "generate-plan" else "literature"
    before = job_state()
    with patch(f"apps.{view_module}.views.require_ai_available") as readiness:
        response = records.client.post(job_url(job, graph), {}, format="json")
    assert response.status_code == 404
    assert response.data["detail"].code == "not_found"
    readiness.assert_not_called()
    assert job_state() == before
    for boundary in vars(external_calls).values():
        boundary.assert_not_called()


@pytest.mark.parametrize("job", JOBS)
def test_configured_openrouter_allows_owner_jobs(records, external_calls, job):
    with patch("apps.agents.llm_gateway.OpenAI") as constructor:
        response = records.client.post(job_url(job, records.own), {}, format="json")
    assert response.status_code == 202
    data = response.json()
    assert AgentRun.objects.filter(pk=data["agent_run_id"], status="running").exists()
    assert AgentEvent.objects.filter(run_id=data["agent_run_id"]).count() == 1
    if job[0] == "generate-plan":
        plan = ExperimentPlan.objects.get(pk=data["plan_id"])
        assert plan.question_id == records.own.question.pk and plan.status == "generating"
        external_calls.generate_plan_task.assert_called_once_with(
            str(records.own.qc.pk), data["agent_run_id"], data["plan_id"],
        )
        external_calls.run_literature_qc_task.assert_not_called()
    else:
        qc = LiteratureQcRun.objects.get(pk=data["qc_run_id"])
        assert qc.question_id == records.own.question.pk and qc.status == "running"
        external_calls.run_literature_qc_task.assert_called_once_with(
            data["qc_run_id"], data["agent_run_id"],
        )
        external_calls.generate_plan_task.assert_not_called()
    constructor.assert_not_called()
    external_calls.generate_json.assert_not_called()
    external_calls.generate_text.assert_not_called()
    external_calls.generate_with_schema.assert_not_called()


@pytest.mark.parametrize("unavailable", [{}, *UNAVAILABLE])
def test_capabilities_only_returns_private_readiness(records, provider_settings, unavailable):
    apply_settings(provider_settings, unavailable)
    with patch("apps.agents.llm_gateway.OpenAI") as constructor:
        response = records.client.get(reverse("capabilities"))
    available = not unavailable
    assert response.status_code == 200
    assert response.json() == {
        "ai_available": available, "message": None if available else AI_UNAVAILABLE_MESSAGE,
    }
    assert response["Cache-Control"] == "private, no-store"
    assert response["CDN-Cache-Control"] == response["Vercel-CDN-Cache-Control"] == "no-store"
    assert {"cookie", "origin"} <= {value.strip().lower() for value in response["Vary"].split(",")}
    for private in (
        "synthetic-openrouter-key", "synthetic-fireworks-key", "moonshotai/kimi-k2.5",
        "https://openrouter.ai", provider_settings.SECRET_KEY,
    ):
        assert private.encode() not in response.content
    constructor.assert_not_called()


def test_capabilities_requires_authentication_before_readiness(db):
    with patch("apps.common.views.is_ai_available") as readiness:
        response = APIClient().get(reverse("capabilities"))
    assert response.status_code == 403
    readiness.assert_not_called()


def test_capabilities_only_accepts_get(records):
    assert records.client.post(reverse("capabilities"), {}, format="json").status_code == 405


@pytest.mark.parametrize("enabled", [True, False])
def test_public_health_body_is_unchanged(db, provider_settings, enabled):
    provider_settings.AI_ENABLED = enabled
    provider_settings.OPENROUTER_API_KEY = ""
    response = APIClient().get(reverse("health"))
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


class JsonAnswer(BaseModel):
    answer: str


def call_gateway(gateway, method):
    kwargs = {"prompt": "Return an answer", "payload": {"private": "test context"}}
    if method == "generate_with_schema":
        kwargs["schema"] = JsonAnswer
    return getattr(gateway, method)(**kwargs)


def completion_client(content='{"answer": "ok"}'):
    client = Mock()
    client.chat.completions.create.return_value = SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=content))],
    )
    return client


@pytest.mark.parametrize("method", ["generate_json", "generate_text", "generate_with_schema"])
def test_openrouter_client_is_lazy_and_calls_selected_model(provider_settings, method):
    client = completion_client()
    with patch("apps.agents.llm_gateway.OpenAI", return_value=client) as constructor:
        gateway = LlmGateway()
        constructor.assert_not_called()
        assert gateway.model == "moonshotai/kimi-k2.5"
        result = call_gateway(gateway, method)
        call_gateway(gateway, method)
    constructor.assert_called_once_with(
        base_url="https://openrouter.ai/api/v1", api_key="synthetic-openrouter-key",
        timeout=45.0, max_retries=1,
    )
    assert client.chat.completions.create.call_count == 2
    kwargs = client.chat.completions.create.call_args.kwargs
    assert kwargs["model"] == "moonshotai/kimi-k2.5"
    assert kwargs["messages"][0]["role"] == "system"
    assert kwargs["messages"][1]["role"] == "user"
    assert '"private": "test context"' in kwargs["messages"][1]["content"]
    if method == "generate_text":
        assert result == '{"answer": "ok"}'
        assert "response_format" not in kwargs
    else:
        assert kwargs["response_format"] == {"type": "json_object"}
        assert (result.model_dump() if method == "generate_with_schema" else result) == {"answer": "ok"}


@pytest.mark.parametrize("method", ["generate_json", "generate_text", "generate_with_schema"])
def test_missing_openrouter_key_never_constructs_or_falls_back(provider_settings, method):
    provider_settings.OPENROUTER_API_KEY = ""
    with patch("apps.agents.llm_gateway.OpenAI") as constructor:
        gateway = LlmGateway()
        assert not is_ai_available()
        with pytest.raises(AiUnavailable, match=AI_UNAVAILABLE_MESSAGE):
            call_gateway(gateway, method)
    constructor.assert_not_called()


@pytest.mark.parametrize("method", ["generate_json", "generate_text", "generate_with_schema"])
def test_provider_errors_do_not_fall_back_or_print_private_data(provider_settings, capsys, method):
    client = completion_client()
    private_error = "synthetic-openrouter-key Private hypothesis provider failure"
    client.chat.completions.create.side_effect = RuntimeError(private_error)
    with patch("apps.agents.llm_gateway.OpenAI", return_value=client) as constructor:
        with pytest.raises(RuntimeError):
            call_gateway(LlmGateway(), method)
    constructor.assert_called_once()
    client.chat.completions.create.assert_called_once()
    output = capsys.readouterr()
    assert "RuntimeError" in output.out
    assert "synthetic-openrouter-key" not in output.out + output.err
    assert "Private hypothesis" not in output.out + output.err
    assert private_error not in output.out + output.err


def test_public_client_override_remains_supported():
    client = completion_client()
    gateway = LlmGateway()
    with patch.object(gateway, "client", client), patch("apps.agents.llm_gateway.OpenAI") as constructor:
        assert call_gateway(gateway, "generate_json") == {"answer": "ok"}
    constructor.assert_not_called()
    client.chat.completions.create.assert_called_once()


def test_explicit_provider_change_replaces_managed_client(provider_settings):
    provider_settings.AI_PROVIDER = "fireworks"
    fireworks, openrouter = completion_client(), completion_client()
    with patch("apps.agents.llm_gateway.OpenAI", side_effect=[fireworks, openrouter]) as constructor:
        gateway = LlmGateway()
        call_gateway(gateway, "generate_json")
        provider_settings.AI_PROVIDER = "openrouter"
        call_gateway(gateway, "generate_json")
    assert constructor.call_count == 2
    assert constructor.call_args_list[0].kwargs == {
        "base_url": provider_settings.FIREWORKS_BASE_URL, "api_key": "synthetic-fireworks-key",
        "timeout": 45.0, "max_retries": 1,
    }
    assert constructor.call_args_list[1].kwargs["base_url"] == "https://openrouter.ai/api/v1"
    assert fireworks.chat.completions.create.call_args.kwargs["model"] == "synthetic-fireworks-model"
    assert openrouter.chat.completions.create.call_args.kwargs["model"] == "moonshotai/kimi-k2.5"


@pytest.mark.parametrize("unavailable", UNAVAILABLE)
def test_unavailable_does_not_reuse_an_initialized_client(provider_settings, unavailable):
    client = completion_client()
    with patch("apps.agents.llm_gateway.OpenAI", return_value=client) as constructor:
        gateway = LlmGateway()
        call_gateway(gateway, "generate_json")
        apply_settings(provider_settings, unavailable)
        with pytest.raises(AiUnavailable):
            call_gateway(gateway, "generate_json")
    constructor.assert_called_once()
    client.chat.completions.create.assert_called_once()


def test_provider_config_repr_excludes_key(provider_settings):
    assert provider_settings.OPENROUTER_API_KEY not in repr(get_ai_config())


@pytest.mark.parametrize("provider", ["fireworks", "openrouter"])
@pytest.mark.parametrize("missing", ["API_KEY", "MODEL"])
def test_readiness_requires_selected_provider_key_and_model(provider_settings, provider, missing):
    provider_settings.AI_PROVIDER = provider
    setattr(provider_settings, f"{provider.upper()}_{missing}", " ")
    assert not is_ai_available()


@pytest.mark.parametrize("env,expected", [
    ({}, [True, "fireworks", "", "moonshotai/kimi-k2.5", "https://openrouter.ai/api/v1"]),
    ({"AI_ENABLED": "false", "AI_PROVIDER": " OpenRouter ", "OPENROUTER_API_KEY": "fake-key",
      "OPENROUTER_MODEL": "custom-model", "OPENROUTER_BASE_URL": "https://ignored.invalid"},
     [False, "openrouter", "fake-key", "custom-model", "https://openrouter.ai/api/v1"]),
])
def test_environment_provider_configuration(env, expected):
    script = (
        "import json; from config import settings; "
        "print(json.dumps([settings.AI_ENABLED, settings.AI_PROVIDER, settings.OPENROUTER_API_KEY, "
        "settings.OPENROUTER_MODEL, settings.OPENROUTER_BASE_URL]))"
    )
    task_env = {
        "PATH": os.path.dirname(sys.executable) + ":/usr/bin:/bin", "PYTHONDONTWRITEBYTECODE": "1", **env,
    }
    result = subprocess.run(
        [sys.executable, "-c", script], env=task_env, capture_output=True, text=True, timeout=10,
    )
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout) == expected
