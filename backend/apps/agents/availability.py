"""Configuration readiness only; checking availability never contacts a provider."""

from dataclasses import dataclass, field

from django.conf import settings
from rest_framework.exceptions import APIException


AI_UNAVAILABLE_MESSAGE = (
    "AI features are currently unavailable. You can still create and view private projects."
)


class AiUnavailable(APIException):
    status_code = 503
    default_detail = AI_UNAVAILABLE_MESSAGE
    default_code = "ai_unavailable"


@dataclass(frozen=True)
class AiProviderConfig:
    provider: str
    base_url: str
    api_key: str = field(repr=False)
    model: str


def get_ai_config() -> AiProviderConfig | None:
    provider = settings.AI_PROVIDER.strip().lower()
    if provider == "openrouter":
        return AiProviderConfig(
            provider, settings.OPENROUTER_BASE_URL,
            settings.OPENROUTER_API_KEY.strip(), settings.OPENROUTER_MODEL.strip(),
        )
    if provider == "fireworks":
        return AiProviderConfig(
            provider, settings.FIREWORKS_BASE_URL,
            settings.FIREWORKS_API_KEY.strip(), settings.FIREWORKS_MODEL.strip(),
        )
    return None


def is_ai_available() -> bool:
    config = get_ai_config()
    return bool(settings.AI_ENABLED and config and config.api_key and config.model)


def require_ai_available() -> AiProviderConfig:
    config = get_ai_config()
    if not (settings.AI_ENABLED and config and config.api_key and config.model):
        raise AiUnavailable()
    return config
