from .models import FeedbackExample, ReviewAnnotation


def create_feedback_example_from_annotation(annotation: ReviewAnnotation, *, domain: str = "other", experiment_type: str = "general") -> FeedbackExample:
    return FeedbackExample.objects.create(
        source_annotation=annotation,
        domain=domain,
        experiment_type=experiment_type,
        input_context={"section_key": annotation.section_key, "tags": annotation.tags},
        bad_output=annotation.original_text,
        corrected_output=annotation.corrected_text,
        lesson=annotation.rationale or f"Correction for {annotation.correction_type}",
        approved_for_reuse=True,
    )


def retrieve_similar_feedback(domain: str, limit: int = 3):
    return FeedbackExample.objects.filter(domain=domain, approved_for_reuse=True).order_by("-created_at")[:limit]
