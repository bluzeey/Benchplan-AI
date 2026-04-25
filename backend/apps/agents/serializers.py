from rest_framework import serializers

from .models import AgentEvent, AgentRun


class AgentEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentEvent
        fields = ["id", "label", "payload", "created_at"]


class AgentRunSerializer(serializers.ModelSerializer):
    events = AgentEventSerializer(many=True, read_only=True)

    class Meta:
        model = AgentRun
        fields = [
            "id",
            "run_type",
            "status",
            "input_payload",
            "output_payload",
            "error_message",
            "events",
            "created_at",
            "updated_at",
        ]
