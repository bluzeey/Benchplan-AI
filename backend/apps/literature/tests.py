from django.test import TestCase

from .services import build_queries
from .services.scoring import score_novelty


class LiteratureServiceTests(TestCase):
    def test_literature_query_generation(self):
        queries = build_queries("Lactobacillus rhamnosus GG C57BL/6 FITC-dextran intestinal permeability")
        self.assertGreaterEqual(len(queries), 6)

    def test_novelty_similar_work(self):
        references = [{"source": "pubmed", "title": "Example"}]
        result = score_novelty(
            "Supplementing C57BL/6 mice with Lactobacillus rhamnosus GG for 4 weeks will reduce intestinal permeability by at least 30% compared to controls measured by FITC-dextran.",
            references,
        )
        self.assertIn(result["novelty_signal"], ["similar_work_exists", "exact_match_found"])

    def test_novelty_not_found(self):
        result = score_novelty("Novel catalytic polymer for asteroid regolith processing", [])
        self.assertEqual(result["novelty_signal"], "not_found")
