from __future__ import annotations

import json
from typing import Any, TypeVar

from django.conf import settings
from openai import OpenAI
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class LlmGateway:
    """Gateway for Fireworks AI LLM calls using OpenAI-compatible API."""

    def __init__(self):
        self.client = OpenAI(
            base_url=settings.FIREWORKS_BASE_URL,
            api_key=settings.FIREWORKS_API_KEY,
        )
        self.model = settings.FIREWORKS_MODEL

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
        # Build the full prompt with payload context
        full_prompt = self._build_prompt(prompt, payload)

        try:
            response = self.client.chat.completions.create(
                model=self.model,
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
            # Log the error and return a fallback response
            print(f"LLM Error: {e}")
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
        full_prompt = self._build_prompt(prompt, payload or {})

        try:
            response = self.client.chat.completions.create(
                model=self.model,
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
            print(f"LLM Error: {e}")
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
        # Include schema info in the prompt for better results
        schema_description = f"\n\nRespond with valid JSON matching this structure: {schema.model_json_schema()}"

        full_prompt = self._build_prompt(prompt + schema_description, payload)

        try:
            response = self.client.chat.completions.create(
                model=self.model,
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
            print(f"LLM Schema Error: {e}")
            raise

    def _build_prompt(self, prompt: str, payload: dict[str, Any]) -> str:
        """Build the full prompt by combining instruction with payload data."""
        if not payload:
            return prompt

        context = json.dumps(payload, indent=2, default=str)
        return f"{prompt}\n\nContext:\n{context}"


# Global instance
llm_gateway = LlmGateway()
