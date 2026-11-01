from rest_framework.generics import ListAPIView

from .models import SafetyAssessment
from .serializers import SafetyAssessmentSerializer
from apps.common.access import owned_questions


class SafetyAssessmentListView(ListAPIView):
    serializer_class = SafetyAssessmentSerializer

    def get_queryset(self):
        return SafetyAssessment.objects.filter(question__in=owned_questions(self.request.user)).order_by("-created_at")
