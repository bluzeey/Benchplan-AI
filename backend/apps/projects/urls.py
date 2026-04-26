from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ProjectAttachmentDeleteView,
    ProjectAttachmentListView,
    ProjectQuestionCreateView,
    ProjectViewSet,
    QuestionDetailView,
)

router = DefaultRouter()
router.register("projects", ProjectViewSet, basename="project")

urlpatterns = [
    path("", include(router.urls)),
    path("projects/<uuid:project_id>/questions/", ProjectQuestionCreateView.as_view(), name="project-question-create"),
    path("projects/<uuid:project_id>/attachments/", ProjectAttachmentListView.as_view(), name="project-attachment-list"),
    path("attachments/<uuid:attachment_id>/", ProjectAttachmentDeleteView.as_view(), name="project-attachment-delete"),
    path("questions/<uuid:question_id>/", QuestionDetailView.as_view(), name="question-detail"),
]
