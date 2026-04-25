from rest_framework import mixins, viewsets
from rest_framework.generics import CreateAPIView, RetrieveAPIView

from .models import ExperimentQuestion, Project
from .serializers import ExperimentQuestionSerializer, ProjectCreateSerializer, ProjectSerializer


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
