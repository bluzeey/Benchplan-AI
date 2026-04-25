from __future__ import annotations

from typing import Any


class LlmGateway:
    def generate_json(self, *, prompt: str, payload: dict[str, Any]) -> dict[str, Any]:
        return {"prompt": prompt, "payload": payload}


llm_gateway = LlmGateway()
