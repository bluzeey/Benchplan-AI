from django.test import TestCase

from apps.agents.registry import _build_materials


class PlanningRuleTests(TestCase):
    def test_material_catalog_number_requires_source(self):
        materials = _build_materials()
        for material in materials:
            if not material.get("catalog_source_url"):
                self.assertEqual(material.get("catalog_number"), "")
                self.assertTrue(material.get("needs_supplier_verification"))
