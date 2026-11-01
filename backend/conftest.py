"""Mock provider and broker boundaries for every test; sockets are also disabled."""

from contextlib import ExitStack
from types import SimpleNamespace
from unittest.mock import patch

import pytest


@pytest.fixture(autouse=True)
def external_calls():
    with ExitStack() as stack:
        mocks = {}
        for method in ("generate_text", "generate_json", "generate_with_schema"):
            mocks[method] = stack.enter_context(patch(
                f"apps.agents.llm_gateway.llm_gateway.{method}",
                side_effect=RuntimeError("Provider disabled in offline tests"),
            ))
        for name in ("run_literature_qc_task", "generate_plan_task"):
            mocks[name] = stack.enter_context(patch(f"apps.agents.tasks.{name}.delay"))
        mocks["storage"] = stack.enter_context(patch("apps.common.views_upload.boto3.client"))
        mocks["plan_title"] = stack.enter_context(patch(
            "apps.planning.services.plan_generator.build_plan_title", return_value="Offline plan title"
        ))
        yield SimpleNamespace(**mocks)
