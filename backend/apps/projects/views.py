from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework import mixins, viewsets
from rest_framework.generics import CreateAPIView, RetrieveAPIView, ListAPIView, DestroyAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.common.access import owned_projects, owned_questions
from apps.common.private_storage import file_redirect, protect_file_response, validate_owned_upload_key

from .models import ProjectAttachment
from .serializers import ExperimentQuestionSerializer, ProjectCreateSerializer, ProjectSerializer, ProjectAttachmentSerializer


class ProjectViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    def get_queryset(self):
        return owned_projects(self.request.user).order_by("-created_at")

    def get_serializer_class(self):
        if self.action == "create":
            return ProjectCreateSerializer
        return ProjectSerializer


class ProjectQuestionCreateView(CreateAPIView):
    serializer_class = ExperimentQuestionSerializer

    def create(self, request, *args, **kwargs):
        self.project = get_object_or_404(owned_projects(request.user), pk=self.kwargs["project_id"])
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(project=self.project)


class QuestionDetailView(RetrieveAPIView):
    serializer_class = ExperimentQuestionSerializer
    lookup_url_kwarg = "question_id"

    def get_queryset(self):
        return owned_questions(self.request.user)


class ProjectAttachmentListView(ListAPIView):
    """List all attachments for a specific project."""
    serializer_class = ProjectAttachmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        project = get_object_or_404(owned_projects(self.request.user), pk=self.kwargs["project_id"])
        return project.attachments.all()


class ProjectAttachmentDeleteView(DestroyAPIView):
    """Delete a specific attachment (owner only)."""
    serializer_class = ProjectAttachmentSerializer
    permission_classes = [IsAuthenticated]
    lookup_url_kwarg = "attachment_id"

    def get_queryset(self):
        return ProjectAttachment.objects.filter(
            project__owner=self.request.user
        )


class ProjectAttachmentDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    def finalize_response(self, request, response, *args, **kwargs):
        return protect_file_response(super().finalize_response(request, response, *args, **kwargs))

    def get(self, request, attachment_id):
        attachment = get_object_or_404(
            ProjectAttachment.objects.filter(project__in=owned_projects(request.user)),
            pk=attachment_id,
        )
        try:
            key = validate_owned_upload_key(attachment.object_key, request.user)
        except ValueError:
            raise Http404
        return file_redirect(
            key, attachment.name, attachment.content_type,
            inline=request.query_params.get("view") == "1",
        )
