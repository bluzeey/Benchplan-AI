from django.test import TestCase

from apps.literature.models import LiteratureQcRun
from apps.planning.models import ExperimentPlan
from apps.projects.models import ExperimentQuestion, Project

from .models import ReviewAnnotation, ReviewSession
from .services import create_feedback_example_from_annotation


class FeedbackTests(TestCase):
    def test_feedback_example_created_from_annotation(self):
        project = Project.objects.create(title="Test project", domain="other")
        question = ExperimentQuestion.objects.create(project=project, raw_text="Hypothesis with control and measurable endpoint over 4 weeks.")
        qc_run = LiteratureQcRun.objects.create(question=question, status="completed")
        plan = ExperimentPlan.objects.create(project=project, question=question, qc_run=qc_run, title="Plan", status="completed")
        review = ReviewSession.objects.create(plan=plan)
        annotation = ReviewAnnotation.objects.create(
            review_session=review,
            section_key="materials",
            correction_type="wrong_catalog_number",
            original_text="ABC123",
            corrected_text="Use source-backed supplier item",
            rationale="Catalog not validated",
            severity="high",
            tags=["materials"],
        )
        example = create_feedback_example_from_annotation(annotation)
        self.assertTrue(example.approved_for_reuse)
        self.assertEqual(example.source_annotation_id, annotation.id)
