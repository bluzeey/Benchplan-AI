from django.urls import path

from .views import LiteratureQcCreateView, LiteratureQcDetailView, LiteratureQcRetryView, LiteratureReferencesView

urlpatterns = [
    path("questions/<uuid:question_id>/literature-qc/", LiteratureQcCreateView.as_view(), name="literature-qc-create"),
    path("literature-qc/<uuid:qc_run_id>/", LiteratureQcDetailView.as_view(), name="literature-qc-detail"),
    path("literature-qc/<uuid:qc_run_id>/references/", LiteratureReferencesView.as_view(), name="literature-references"),
    path("literature-qc/<uuid:qc_run_id>/retry/", LiteratureQcRetryView.as_view(), name="literature-qc-retry"),
]
