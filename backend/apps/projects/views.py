from rest_framework import mixins, viewsets, status
from rest_framework.generics import CreateAPIView, RetrieveAPIView, ListAPIView, DestroyAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import ExperimentQuestion, Project, ProjectAttachment
from .serializers import ExperimentQuestionSerializer, ProjectCreateSerializer, ProjectSerializer, ProjectAttachmentSerializer


class ProjectViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    def get_queryset(self):
        if self.request.user.is_authenticated:
            return Project.objects.filter(owner=self.request.user).order_by("-created_at")
        return Project.objects.none()

    def get_serializer_class(self):
        if self.action == "create":
            return ProjectCreateSerializer
        return ProjectSerializer


class ProjectQuestionCreateView(CreateAPIView):
    serializer_class = ExperimentQuestionSerializer

    def perform_create(self, serializer):
        serializer.save(project_id=self.kwargs["project_id"])


class QuestionDetailView(RetrieveAPIView):
    queryset = ExperimentQuestion.objects.all()
    serializer_class = ExperimentQuestionSerializer
    lookup_url_kwarg = "question_id"


class ProjectAttachmentListView(ListAPIView):
    """List all attachments for a specific project."""
    serializer_class = ProjectAttachmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        project_id = self.kwargs["project_id"]
        return ProjectAttachment.objects.filter(
            project__id=project_id,
            project__owner=self.request.user
        )


class ProjectAttachmentDeleteView(DestroyAPIView):
    """Delete a specific attachment (owner only)."""
    serializer_class = ProjectAttachmentSerializer
    permission_classes = [IsAuthenticated]
    lookup_url_kwarg = "attachment_id"

    def get_queryset(self):
        return ProjectAttachment.objects.filter(
            project__owner=self.request.user
        )
