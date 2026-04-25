from rest_framework.generics import ListAPIView

from .models import SafetyAssessment
from .serializers import SafetyAssessmentSerializer


class SafetyAssessmentListView(ListAPIView):
    serializer_class = SafetyAssessmentSerializer

    def get_queryset(self):
        return SafetyAssessment.objects.all().order_by("-created_at")
