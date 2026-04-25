from django.urls import path

from .views import PlanBudgetCsvExportView, PlanMarkdownExportView, PlanMaterialsCsvExportView

urlpatterns = [
    path("plans/<uuid:plan_id>/export/markdown/", PlanMarkdownExportView.as_view(), name="export-markdown"),
    path("plans/<uuid:plan_id>/export/materials.csv", PlanMaterialsCsvExportView.as_view(), name="export-materials-csv"),
    path("plans/<uuid:plan_id>/export/budget.csv", PlanBudgetCsvExportView.as_view(), name="export-budget-csv"),
]
