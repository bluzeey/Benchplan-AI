from rest_framework import serializers

from .models import SafetyAssessment


class SafetyAssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SafetyAssessment
        fields = "__all__"
