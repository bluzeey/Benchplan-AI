from django.urls import path

from .views import (
    GeneratePlanView,
    PlanBudgetView,
    PlanDetailView,
    PlanListView,
    PlanMaterialsView,
    PlanSectionPatchView,
    PlanSectionsView,
    PlanTimelineView,
)

urlpatterns = [
    path("literature-qc/<uuid:qc_run_id>/generate-plan/", GeneratePlanView.as_view(), name="generate-plan"),
    path("plans/", PlanListView.as_view(), name="plan-list"),
    path("plans/<uuid:plan_id>/", PlanDetailView.as_view(), name="plan-detail"),
    path("plans/<uuid:plan_id>/sections/", PlanSectionsView.as_view(), name="plan-sections"),
    path("plans/<uuid:plan_id>/sections/<uuid:section_id>/", PlanSectionPatchView.as_view(), name="plan-section-patch"),
    path("plans/<uuid:plan_id>/materials/", PlanMaterialsView.as_view(), name="plan-materials"),
    path("plans/<uuid:plan_id>/budget/", PlanBudgetView.as_view(), name="plan-budget"),
    path("plans/<uuid:plan_id>/timeline/", PlanTimelineView.as_view(), name="plan-timeline"),
]
