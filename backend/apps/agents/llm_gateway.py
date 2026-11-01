from __future__ import annotations

import json
from typing import Any, TypeVar

from openai import OpenAI
from pydantic import BaseModel

from .availability import AiProviderConfig, get_ai_config, require_ai_available

T = TypeVar("T", bound=BaseModel)


class LlmGateway:
    """Gateway for the selected provider's OpenAI-compatible API."""

    def __init__(self):
        # Keep a public, assignable client for existing test overrides.
        self.client = None
        self._managed_client = None
        self._client_config = None

    @property
    def model(self):
        config = get_ai_config()
        return config.model if config else ""

    def _get_client(self, config: AiProviderConfig):
        if self.client is None or (
            self.client is self._managed_client and self._client_config != config
        ):
            self.client = OpenAI(
                base_url=config.base_url,
                api_key=config.api_key,
                timeout=45.0,
                max_retries=1,
            )
            self._managed_client = self.client
            self._client_config = config
        return self.client

    def generate_json(
        self,
        *,
        prompt: str,
        payload: dict[str, Any],
        system_message: str = "You are a helpful AI assistant that always responds in valid JSON format.",
        temperature: float = 0.3,
    ) -> dict[str, Any]:
        """
        Generate structured JSON output from the LLM.

        Args:
            prompt: The user prompt/instruction
            payload: Additional data to include in the context
            system_message: System message to guide the model
            temperature: Sampling temperature (0-1, lower = more deterministic)

        Returns:
            Parsed JSON response as a dictionary
        """
        config = require_ai_available()
        # Build the full prompt with payload context
        full_prompt = self._build_prompt(prompt, payload)

        try:
            response = self._get_client(config).chat.completions.create(
                model=config.model,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": full_prompt},
                ],
                temperature=temperature,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            if not content:
                raise ValueError("Empty response from LLM")

            return json.loads(content)

        except Exception as e:
            # Log only the exception type; provider errors can contain private data.
            print(f"LLM request failed: {type(e).__name__}")
            raise

    def generate_text(
        self,
        *,
        prompt: str,
        payload: dict[str, Any] | None = None,
        system_message: str = "You are a helpful AI assistant.",
        temperature: float = 0.7,
    ) -> str:
        """
        Generate plain text output from the LLM.

        Args:
            prompt: The user prompt/instruction
            payload: Additional data to include in the context
            system_message: System message to guide the model
            temperature: Sampling temperature (0-1)

        Returns:
            Text response from the model
        """
        config = require_ai_available()
        full_prompt = self._build_prompt(prompt, payload or {})

        try:
            response = self._get_client(config).chat.completions.create(
                model=config.model,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": full_prompt},
                ],
                temperature=temperature,
            )

            content = response.choices[0].message.content
            if not content:
                raise ValueError("Empty response from LLM")

            return content

        except Exception as e:
            print(f"LLM request failed: {type(e).__name__}")
            raise

    def generate_with_schema(
        self,
        *,
        prompt: str,
        payload: dict[str, Any],
        schema: type[T],
        system_message: str = "You are a helpful AI assistant that always responds in valid JSON format.",
        temperature: float = 0.3,
    ) -> T:
        """
        Generate output and validate against a Pydantic schema.

        Args:
            prompt: The user prompt/instruction
            payload: Additional data to include in the context
            schema: Pydantic model class to validate against
            system_message: System message to guide the model
            temperature: Sampling temperature (0-1)

        Returns:
            Validated Pydantic model instance
        """
        config = require_ai_available()
        # Include schema info in the prompt for better results
        schema_description = f"\n\nRespond with valid JSON matching this structure: {schema.model_json_schema()}"

        full_prompt = self._build_prompt(prompt + schema_description, payload)

        try:
            response = self._get_client(config).chat.completions.create(
                model=config.model,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": full_prompt},
                ],
                temperature=temperature,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            if not content:
                raise ValueError("Empty response from LLM")

            data = json.loads(content)
            return schema(**data)

        except Exception as e:
            print(f"LLM schema request failed: {type(e).__name__}")
            raise

    def _build_prompt(self, prompt: str, payload: dict[str, Any]) -> str:
        """Build the full prompt by combining instruction with payload data."""
        if not payload:
            return prompt

        context = json.dumps(payload, indent=2, default=str)
        return f"{prompt}\n\nContext:\n{context}"


# Global instance
llm_gateway = LlmGateway()
