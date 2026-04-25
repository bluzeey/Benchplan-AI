import csv
from io import StringIO

from django.http import HttpResponse
from rest_framework.views import APIView

from apps.planning.models import ExperimentPlan

from .renderers import render_plan_markdown


class PlanMarkdownExportView(APIView):
    def get(self, request, plan_id):
        plan = ExperimentPlan.objects.get(id=plan_id)
        body = render_plan_markdown(plan)
        response = HttpResponse(body, content_type="text/markdown")
        response["Content-Disposition"] = f'attachment; filename="plan-{plan_id}.md"'
        return response


class PlanMaterialsCsvExportView(APIView):
    def get(self, request, plan_id):
        plan = ExperimentPlan.objects.get(id=plan_id)
        buffer = StringIO()
        writer = csv.writer(buffer)
        writer.writerow(["Item", "Category", "Supplier", "Catalog Number", "Quantity", "Estimated Unit Cost", "Estimated Total", "Needs Verification"])
        for material in plan.materials.all().order_by("name"):
            writer.writerow(
                [
                    material.name,
                    material.category,
                    material.supplier,
                    material.catalog_number,
                    material.quantity,
                    material.estimated_unit_cost,
                    material.estimated_total_cost,
                    material.needs_supplier_verification,
                ]
            )
        response = HttpResponse(buffer.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="materials-{plan_id}.csv"'
        return response


class PlanBudgetCsvExportView(APIView):
    def get(self, request, plan_id):
        plan = ExperimentPlan.objects.get(id=plan_id)
        buffer = StringIO()
        writer = csv.writer(buffer)
        writer.writerow(["Category", "Label", "Quantity", "Unit Cost", "Total Cost", "Assumptions"])
        for line in plan.budget_lines.all().order_by("category"):
            writer.writerow([line.category, line.label, line.quantity, line.unit_cost, line.total_cost, line.assumptions])
        response = HttpResponse(buffer.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="budget-{plan_id}.csv"'
        return response
