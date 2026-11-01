from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model

from .models import Project


class ProjectApiTests(APITestCase):
    def test_create_project(self):
        user = get_user_model().objects.create_user(username="owner", email="owner@example.invalid")
        self.client.force_authenticate(user=user)
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
        self.assertEqual(Project.objects.first().owner, user)
