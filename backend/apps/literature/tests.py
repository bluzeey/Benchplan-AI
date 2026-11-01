import os
from unittest.mock import patch

from django.test import TestCase

from .services import build_queries, run_literature_search
from .services.openalex import _normalize_doi
from .services.scoring import score_novelty


class LiteratureServiceTests(TestCase):
    def test_literature_query_generation(self):
        queries = build_queries("Lactobacillus rhamnosus GG C57BL/6 FITC-dextran intestinal permeability")
        self.assertGreaterEqual(len(queries), 6)

    def test_novelty_is_unassessed_when_provider_is_unavailable(self):
        references = [{"source": "pubmed", "title": "Retrieved paper", "pmid": "123456"}]
        with patch("apps.literature.services.scoring.llm_gateway.generate_json", side_effect=RuntimeError):
            result = score_novelty("Synthetic hypothesis with a control condition", references)
        self.assertEqual(result["novelty_signal"], "inconclusive")
        self.assertEqual(result["confidence"], 0)

    def test_missing_references_do_not_imply_novelty(self):
        result = score_novelty("Novel catalytic polymer for asteroid regolith processing", [])
        self.assertEqual(result["novelty_signal"], "inconclusive")
        self.assertEqual(result["confidence"], 0)

    def test_openalex_used_when_semantic_key_missing(self):
        with patch.dict(os.environ, {"SEMANTIC_SCHOLAR_API_KEY": ""}, clear=False):
            with patch("apps.literature.services.search_pubmed", return_value=[]), patch(
                "apps.literature.services.search_europe_pmc", return_value=[]
            ), patch("apps.literature.services.search_protocols_io", return_value=[]), patch(
                "apps.literature.services.search_semantic_scholar", return_value=[]
            ) as semantic_mock, patch(
                "apps.literature.services.search_openalex",
                return_value=[{"source": "openalex", "title": "OpenAlex paper", "url": "https://openalex.org/W123456"}],
            ) as openalex_mock:
                _, refs = run_literature_search("test query")

        self.assertEqual(len(refs), 1)
        self.assertEqual(refs[0]["source"], "openalex")
        semantic_mock.assert_not_called()
        self.assertGreaterEqual(openalex_mock.call_count, 1)

    def test_openalex_fallback_when_semantic_empty(self):
        with patch.dict(os.environ, {"SEMANTIC_SCHOLAR_API_KEY": "fake-key"}, clear=False):
            with patch("apps.literature.services.search_pubmed", return_value=[]), patch(
                "apps.literature.services.search_europe_pmc", return_value=[]
            ), patch("apps.literature.services.search_protocols_io", return_value=[]), patch(
                "apps.literature.services.search_semantic_scholar", return_value=[]
            ) as semantic_mock, patch(
                "apps.literature.services.search_openalex",
                return_value=[{"source": "openalex", "title": "OpenAlex paper", "url": "https://openalex.org/W123456"}],
            ) as openalex_mock:
                _, refs = run_literature_search("test query")

        self.assertEqual(len(refs), 1)
        self.assertEqual(refs[0]["source"], "openalex")
        self.assertGreaterEqual(semantic_mock.call_count, 1)
        self.assertGreaterEqual(openalex_mock.call_count, 1)

    def test_openalex_doi_normalization(self):
        self.assertEqual(_normalize_doi("https://doi.org/10.1000/test"), "10.1000/test")
        self.assertEqual(_normalize_doi("10.1000/test"), "10.1000/test")
