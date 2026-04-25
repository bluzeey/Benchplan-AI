from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ProjectQuestionCreateView, ProjectViewSet, QuestionDetailView

router = DefaultRouter()
router.register("projects", ProjectViewSet, basename="project")

urlpatterns = [
    path("", include(router.urls)),
    path("projects/<uuid:project_id>/questions/", ProjectQuestionCreateView.as_view(), name="project-question-create"),
    path("questions/<uuid:question_id>/", QuestionDetailView.as_view(), name="question-detail"),
]
