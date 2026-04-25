from django.urls import path

from .views import SafetyAssessmentListView

urlpatterns = [
    path("safety/assessments/", SafetyAssessmentListView.as_view(), name="safety-assessment-list"),
]
