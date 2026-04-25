from rest_framework.test import APITestCase

from .models import Project


class ProjectApiTests(APITestCase):
    def test_create_project(self):
        payload = {
            "title": "LGG gut permeability mouse study",
            "hypothesis": "Supplementing C57BL/6 mice with Lactobacillus rhamnosus GG for 4 weeks will reduce intestinal permeability by at least 30% compared to controls measured by FITC-dextran assay.",
            "domain": "animal_model",
            "currency": "USD",
            "target_duration_weeks": 8,
            "lab_type": "academic",
        }
        response = self.client.post("/api/projects/", payload, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Project.objects.count(), 1)
        self.assertEqual(Project.objects.first().questions.count(), 1)
