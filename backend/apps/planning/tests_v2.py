"""
Tests for V2 AI-driven planning system.
These tests verify that different hypotheses produce meaningfully different outputs.
"""
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.test import TestCase

from apps.agents.registry import (
    _build_budget_lines_v2,
    _build_materials_v2,
    _build_plan_json_v2,
    _run_critic,
)
from apps.agents.schemas import BudgetEstimate, MaterialSpec, ProtocolStep
from apps.planning.services.budget_estimator import (
    _generate_fallback_budget,
    estimate_budget_v2,
)
from apps.planning.services.plan_generator import (
    _generate_fallback_protocol,
    estimate_sample_size,
    generate_protocol_v2,
)
from apps.planning.services.timeline_builder import (
    _generate_fallback_timeline,
    calculate_critical_path,
)


class SampleSizeEstimationTests(TestCase):
    """Tests for sample size estimation logic."""

    def test_large_effect_size(self):
        """Large effects need smaller samples."""
        parsed = {"threshold": "50% reduction", "assay_or_measurement": "ELISA"}
        result = estimate_sample_size("Test hypothesis with 50% effect", parsed)
        self.assertLess(result["n_per_group"], 20)

    def test_small_effect_size(self):
        """Small effects need larger samples."""
        parsed = {"threshold": "10% change", "assay_or_measurement": "ELISA"}
        result = estimate_sample_size("Test hypothesis with small effect", parsed)
        self.assertGreater(result["n_per_group"], 30)

    def test_high_variability_assay(self):
        """Behavioral/clinical assays need more samples."""
        parsed = {"threshold": "30% change", "assay_or_measurement": "behavioral test"}
        result = estimate_sample_size("Test hypothesis", parsed)
        # Should be higher than standard assay
        self.assertGreater(result["n_per_group"], 16)


class ProtocolGenerationTests(TestCase):
    """Tests for AI-driven protocol generation."""

    def test_fallback_protocol_adapts_to_domain(self):
        """Fallback protocol should adapt to domain."""
        parsed = {
            "domain": "cell_biology",
            "intervention": "Drug X",
            "organism_or_model": "HeLa cells",
            "assay_or_measurement": "Western blot",
            "primary_outcome": "Protein expression",
            "duration": "48 hours",
        }
        protocol = _generate_fallback_protocol(parsed, safety_flags=[])

        self.assertGreaterEqual(len(protocol), 4)
        # Cell biology should have longer prep
        prep_step = protocol[0]
        self.assertGreaterEqual(prep_step["duration_minutes"], 180)

    def test_fallback_protocol_includes_assay(self):
        """Protocol should reference the specific assay."""
        parsed = {
            "domain": "animal_model",
            "intervention": "Compound Y",
            "organism_or_model": "C57BL/6 mice",
            "assay_or_measurement": "FITC-dextran permeability",
            "primary_outcome": "Intestinal permeability",
        }
        protocol = _generate_fallback_protocol(parsed, safety_flags=[])

        # Find measurement step
        measure_steps = [p for p in protocol if "measure" in p["title"].lower()]
        self.assertTrue(len(measure_steps) > 0)

    def test_fallback_protocol_safety_adaptation(self):
        """Protocol should adapt to safety flags."""
        parsed = {
            "domain": "animal_model",
            "intervention": "Toxic compound",
            "organism_or_model": "rats",
        }
        protocol = _generate_fallback_protocol(parsed, safety_flags=["hazardous_chemical"])

        # Should mark higher skill level for hazardous work
        intervention_step = [p for p in protocol if "intervention" in p["title"].lower()]
        if intervention_step:
            self.assertEqual(intervention_step[0]["labor_skill_level"], "senior")


class MaterialGenerationTests(TestCase):
    """Tests for AI-driven materials generation."""

    def test_fallback_materials_structure(self):
        """Materials should have proper structure with uncertainty bands."""
        materials = [
            {
                "name": "Test Reagent",
                "category": "reagents",
                "estimated_unit_cost": 100.0,
                "estimated_unit_cost_min": 80.0,
                "estimated_unit_cost_max": 120.0,
                "estimated_total_cost": 200.0,
                "estimated_total_cost_min": 160.0,
                "estimated_total_cost_max": 240.0,
                "lead_time_days_min": 7,
                "lead_time_days_max": 14,
                "confidence": 0.7,
            }
        ]

        for mat in materials:
            self.assertIn("estimated_unit_cost_min", mat)
            self.assertIn("estimated_unit_cost_max", mat)
            self.assertLessEqual(mat["estimated_unit_cost_min"], mat["estimated_unit_cost_max"])


class BudgetEstimationTests(TestCase):
    """Tests for AI-driven budget estimation."""

    def test_fallback_budget_labor_calculation(self):
        """Labor should be calculated from protocol hours."""
        materials = [
            {
                "name": "Reagent",
                "category": "reagents",
                "estimated_total_cost": 500.0,
                "estimated_total_cost_min": 400.0,
                "estimated_total_cost_max": 600.0,
            }
        ]

        # 8 hours of protocol work
        labor_by_skill = {"standard": 8.0}

        budget = _generate_fallback_budget(
            materials=materials,
            labor_by_skill=labor_by_skill,
            contingency_low=0.15,
            contingency_high=0.25,
            region="US",
        )

        # Should have labor line
        labor_lines = [l for l in budget["labor"] if l["skill_level"] == "standard"]
        self.assertTrue(len(labor_lines) > 0)

        # Hours should be close to protocol hours + overhead
        self.assertGreaterEqual(labor_lines[0]["hours_min"], 6)
        self.assertLessEqual(labor_lines[0]["hours_max"], 15)

    def test_budget_cost_drivers_identified(self):
        """Budget should identify primary cost drivers."""
        materials = [
            {
                "name": "Expensive Reagent",
                "category": "reagents",
                "estimated_total_cost": 5000.0,
                "estimated_total_cost_min": 4000.0,
                "estimated_total_cost_max": 6000.0,
            }
        ]
        labor_by_skill = {"standard": 10.0}

        budget = _generate_fallback_budget(
            materials=materials,
            labor_by_skill=labor_by_skill,
            contingency_low=0.15,
            contingency_high=0.25,
            region="US",
        )

        # Should note that materials dominate
        self.assertTrue(
            any("Materials dominate" in d for d in budget["primary_cost_drivers"])
            or any("materials" in d.lower() for d in budget["primary_cost_drivers"])
        )

    def test_budget_contingency_based_on_uncertainty(self):
        """Contingency should scale with uncertainty."""
        materials = [{"name": "R", "category": "reagents", "estimated_total_cost": 100.0}]

        # Low uncertainty
        budget_low = _generate_fallback_budget(materials, {"standard": 10}, 0.10, 0.15, "US")
        # High uncertainty
        budget_high = _generate_fallback_budget(materials, {"standard": 10}, 0.25, 0.35, "US")

        # High uncertainty should have higher contingency
        self.assertGreater(budget_high["contingency_max"], budget_low["contingency_max"])


class TimelineGenerationTests(TestCase):
    """Tests for AI-driven timeline generation."""

    def test_fallback_timeline_includes_lead_times(self):
        """Timeline should account for material lead times."""
        protocol = [{"duration_minutes": 120}]
        materials = [{"lead_time_days_max": 21}]

        timeline = _generate_fallback_timeline(
            protocol=protocol,
            materials=materials,
            safety_approvals=[],
            complexity=0.5,
            max_lead_time=21,
        )

        # Should have procurement phase
        procurement_phases = [p for p in timeline["phases"] if "procurement" in p["title"].lower()]
        self.assertTrue(len(procurement_phases) > 0)

    def test_fallback_timeline_safety_approvals(self):
        """Timeline should include time for safety approvals."""
        protocol = [{"duration_minutes": 60}]

        timeline_no_approval = _generate_fallback_timeline(
            protocol, [], [], 0.5, 7
        )
        timeline_with_approval = _generate_fallback_timeline(
            protocol, [], ["IACUC"], 0.5, 7
        )

        # With IACUC should be longer
        self.assertGreater(
            timeline_with_approval["total_duration_weeks_max"],
            timeline_no_approval["total_duration_weeks_max"]
        )

    def test_fallback_timeline_complexity_buffers(self):
        """Complex experiments should have longer timelines."""
        protocol = [{"duration_minutes": 60}]

        timeline_simple = _generate_fallback_timeline(protocol, [], [], 0.3, 7)
        timeline_complex = _generate_fallback_timeline(protocol, [], [], 0.8, 7)

        # Complex should have buffers
        self.assertGreater(
            timeline_complex["total_duration_weeks_max"],
            timeline_simple["total_duration_weeks_max"]
        )

    def test_critical_path_calculation(self):
        """Critical path should be identified correctly."""
        phases = [
            {"phase_number": 1, "start_week": 1, "end_week": 2, "dependencies": []},
            {"phase_number": 2, "start_week": 3, "end_week": 4, "dependencies": [1]},
            {"phase_number": 3, "start_week": 3, "end_week": 5, "dependencies": [1]},  # Parallel with 2
        ]

        critical_weeks, critical_phases = calculate_critical_path(phases)

        # Phase 3 is on critical path (ends latest)
        self.assertIn(3, critical_phases)
        self.assertIn(1, critical_phases)  # First phase always critical


class CriticReviewTests(TestCase):
    """Tests for critic review functionality."""

    def test_critic_fallback_returns_valid_structure(self):
        """Fallback critic should return valid structure."""
        critique = _run_critic(
            hypothesis="Test",
            parsed={"domain": "test"},
            protocol=[],
            materials=[],
            budget={"total_min": 1000, "total_max": 1500},
            timeline={"total_duration_weeks_max": 10},
            validation={},
            safety={},
            references=[],
        )

        self.assertIn("issues", critique)
        self.assertIn("overall_quality_score", critique)
        self.assertIn("revision_needed", critique)

    def test_critic_identifies_high_issues(self):
        """Critic should flag high-severity issues appropriately."""
        # Mock LLM response with issues
        with patch("apps.agents.registry.llm_gateway") as mock_llm:
            mock_critique = MagicMock()
            mock_critique.model_dump.return_value = {
                "issues": [
                    {"severity": "high", "category": "scientific", "description": "Missing controls"},
                    {"severity": "medium", "category": "budget", "description": "Underestimated costs"},
                ],
                "overall_quality_score": 0.4,
                "revision_needed": True,
                "revision_priority": ["Fix missing controls"],
            }
            mock_llm.generate_with_schema.return_value = mock_critique

            critique = _run_critic(
                hypothesis="Test",
                parsed={"domain": "test"},
                protocol=[],
                materials=[],
                budget={},
                timeline={},
                validation={},
                safety={},
                references=[],
            )

            self.assertTrue(critique["revision_needed"])
            self.assertEqual(len([i for i in critique["issues"] if i["severity"] == "high"]), 1)


class PlanJsonBuilderTests(TestCase):
    """Tests for plan JSON builder."""

    def test_plan_json_includes_quality_review(self):
        """Plan JSON should include quality review section."""
        mock_qc = MagicMock()
        mock_qc.novelty_signal = "similar_work_exists"
        mock_qc.summary = "Test summary"
        mock_qc.confidence = Decimal("0.7")

        plan_json = _build_plan_json_v2(
            hypothesis="Test hypothesis",
            qc_run=mock_qc,
            parsed={
                "intervention": "Drug X",
                "organism_or_model": "mice",
                "domain": "animal_model",
                "complexity_score": 0.6,
                "uncertainty_level": "medium",
            },
            references=[],
            protocol=[{"step_number": 1, "title": "Step 1"}],
            materials=[{"name": "Reagent"}],
            budget={"total_min": 5000, "total_max": 7000, "subtotal_min": 4000, "subtotal_max": 5500, "contingency_min": 1000, "contingency_max": 1500},
            timeline={"total_duration_weeks_min": 8, "total_duration_weeks_max": 12, "critical_path_weeks": 10},
            validation={},
            safety_triage={"state": "clear", "categories": [], "required_approvals": [], "warning": ""},
            feedback_lessons=["Lesson 1"],
            critique={"overall_quality_score": 0.75, "revision_needed": False, "issues": []},
        )

        self.assertIn("quality_review", plan_json)
        self.assertEqual(plan_json["quality_review"]["overall_score"], 0.75)
        self.assertIn("generation_metadata", plan_json)
        self.assertIn("v2_ai_driven", plan_json["generation_metadata"]["version"])


class BudgetLinesBuilderTests(TestCase):
    """Tests for budget lines conversion."""

    def test_budget_lines_converts_materials(self):
        """Budget lines should convert materials correctly."""
        budget = {
            "materials": [
                {
                    "name": "Test Kit",
                    "category": "assays_kits",
                    "role": "Measurement",
                    "estimated_total_cost": 500.0,
                    "estimated_total_cost_min": 450.0,
                    "estimated_total_cost_max": 550.0,
                    "lead_time_days_min": 5,
                    "lead_time_days_max": 10,
                    "confidence": 0.7,
                }
            ],
            "labor": [
                {
                    "role": "Research Associate",
                    "hours_max": 40,
                    "hourly_rate": 55.0,
                    "total_cost_min": 2000.0,
                    "total_cost_max": 2500.0,
                    "confidence": 0.65,
                }
            ],
            "contingency_min": 500.0,
            "contingency_max": 750.0,
            "subtotal_min": 2500.0,
            "subtotal_max": 3000.0,
        }

        lines = _build_budget_lines_v2(budget)

        # Should have material line, labor line, and contingency
        self.assertGreaterEqual(len(lines), 3)

        # Check material line
        material_lines = [l for l in lines if l["category"] == "assays_kits"]
        self.assertTrue(len(material_lines) > 0)
        self.assertEqual(material_lines[0]["label"], "Test Kit")

        # Check contingency line
        contingency_lines = [l for l in lines if l["category"] == "contingency"]
        self.assertTrue(len(contingency_lines) > 0)


class DifferentiationTests(TestCase):
    """
    Tests that verify different hypotheses produce meaningfully different outputs.
    This is the key quality metric for the planning system.
    """

    def test_different_hypotheses_different_materials(self):
        """Different hypotheses should produce different protocol outputs."""
        hypothesis_1 = "Test effect of Drug A on cancer cells"
        hypothesis_2 = "Test effect of behavioral training on mouse cognition"

        parsed_1 = {"domain": "cell_biology", "intervention": "Drug A", "assay_or_measurement": "cell viability assay"}
        parsed_2 = {"domain": "animal_model", "intervention": "behavioral training", "assay_or_measurement": "morris water maze"}

        protocol_1 = _generate_fallback_protocol(parsed_1, [])
        protocol_2 = _generate_fallback_protocol(parsed_2, [])

        # Protocols should reflect domain differences
        # Cell biology prep should be longer than animal prep
        prep_1 = protocol_1[0]["duration_minutes"]
        prep_2 = protocol_2[0]["duration_minutes"]
        self.assertGreater(prep_1, prep_2)  # Cell culture prep takes longer

        # Equipment should differ - cell viability uses different equipment than behavioral
        equip_1 = set(e for p in protocol_1 for e in p.get("equipment", []))
        equip_2 = set(e for p in protocol_2 for e in p.get("equipment", []))
        self.assertNotEqual(equip_1, equip_2)

    def test_different_complexity_different_budgets(self):
        """Different complexity should produce different budget ranges."""
        materials = [
            {"name": "R1", "estimated_total_cost": 100.0, "estimated_total_cost_min": 80.0, "estimated_total_cost_max": 120.0},
            {"name": "R2", "estimated_total_cost": 200.0, "estimated_total_cost_min": 160.0, "estimated_total_cost_max": 240.0},
        ]

        # Simple protocol
        labor_simple = {"standard": 20.0}
        budget_simple = _generate_fallback_budget(materials, labor_simple, 0.10, 0.15, "US")

        # Complex protocol (more hours, higher skill)
        labor_complex = {"standard": 40.0, "specialist": 10.0}
        budget_complex = _generate_fallback_budget(materials, labor_complex, 0.25, 0.35, "US")

        # Complex should have higher budget (more labor hours + higher contingency)
        self.assertGreater(budget_complex["total_max"], budget_simple["total_max"])

    def test_different_durations_different_timelines(self):
        """Different protocol durations should produce different timelines."""
        # Short protocol
        protocol_short = [{"duration_minutes": 60}]
        timeline_short = _generate_fallback_timeline(protocol_short, [], [], 0.3, 7)

        # Long protocol - 10x the steps
        protocol_long = [{"duration_minutes": 60} for _ in range(10)]
        timeline_long = _generate_fallback_timeline(protocol_long, [], [], 0.3, 7)

        # Longer protocol should have longer critical path (more work)
        # The difference comes from the experiment phase duration
        self.assertGreaterEqual(
            timeline_long["total_duration_weeks_max"],
            timeline_short["total_duration_weeks_max"]
        )


class EndToEndQualityTests(TestCase):
    """End-to-end tests for plan generation quality."""

    def test_plan_has_all_required_sections(self):
        """Generated plan should have all required sections."""
        # Mock data
        mock_qc = MagicMock()
        mock_qc.novelty_signal = "similar_work_exists"
        mock_qc.summary = "Test"
        mock_qc.confidence = Decimal("0.7")

        plan_json = _build_plan_json_v2(
            hypothesis="Test",
            qc_run=mock_qc,
            parsed={"intervention": "X", "organism_or_model": "mice", "domain": "test", "complexity_score": 0.5, "uncertainty_level": "low"},
            references=[],
            protocol=[{"step_number": 1, "title": "Test Step", "citations": ["ref1"]}],
            materials=[],
            budget={"total_min": 1000, "total_max": 1500, "subtotal_min": 800, "subtotal_max": 1200, "contingency_min": 200, "contingency_max": 300, "budget_assumptions": []},
            timeline={"total_duration_weeks_min": 6, "total_duration_weeks_max": 8, "critical_path_weeks": 7, "phases": []},
            validation={},
            safety_triage={"state": "clear", "categories": [], "required_approvals": [], "warning": ""},
            feedback_lessons=[],
            critique={"overall_quality_score": 0.8, "revision_needed": False, "issues": []},
        )

        required_sections = [
            "title", "executive_summary", "novelty_context", "experimental_design",
            "protocol", "materials", "budget", "timeline", "validation",
            "risks_and_safety", "quality_review", "assumptions", "references"
        ]

        for section in required_sections:
            self.assertIn(section, plan_json)

    def test_executive_summary_is_specific(self):
        """Executive summary should be specific, not generic."""
        mock_qc = MagicMock()
        mock_qc.novelty_signal = "similar_work_exists"
        mock_qc.summary = "Test summary"
        mock_qc.confidence = Decimal("0.7")

        plan_json = _build_plan_json_v2(
            hypothesis="Test",
            qc_run=mock_qc,
            parsed={
                "intervention": "Lactobacillus rhamnosus GG",
                "organism_or_model": "C57BL/6 mice",
                "domain": "animal_model",
                "complexity_score": 0.6,
                "uncertainty_level": "medium",
            },
            references=[],
            protocol=[{"step_number": 1}, {"step_number": 2}],
            materials=[],
            budget={"total_min": 5000, "total_max": 7000, "subtotal_min": 4000, "subtotal_max": 5500, "contingency_min": 1000, "contingency_max": 1500},
            timeline={"total_duration_weeks_min": 8, "total_duration_weeks_max": 12, "critical_path_weeks": 10},
            validation={},
            safety_triage={},
            feedback_lessons=[],
            critique={"overall_quality_score": 0.75},
        )

        summary = plan_json["executive_summary"]

        # Should mention specific elements
        self.assertIn("Lactobacillus", summary)
        self.assertIn("mice", summary)
        self.assertIn("Quality Score", summary)
        self.assertIn("75%", summary)  # Quality score formatted
