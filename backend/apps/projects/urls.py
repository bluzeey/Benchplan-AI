from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ProjectAttachmentDeleteView,
    ProjectAttachmentDownloadView,
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
    path("attachments/<uuid:attachment_id>/download/", ProjectAttachmentDownloadView.as_view(), name="project-attachment-download"),
    path("questions/<uuid:question_id>/", QuestionDetailView.as_view(), name="question-detail"),
]
