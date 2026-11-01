from rest_framework import serializers

from .models import SafetyAssessment


class SafetyAssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SafetyAssessment
        fields = "__all__"
        read_only_fields = ["question"]
