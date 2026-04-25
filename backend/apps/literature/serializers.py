from rest_framework import serializers

from .models import LiteratureQcRun, Reference


class ReferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reference
        fields = [
            "id",
            "title",
            "source",
            "year",
            "doi",
            "url",
            "pmid",
            "protocol_id",
            "relevance_score",
            "why_relevant",
            "match_json",
        ]


class LiteratureQcRunSerializer(serializers.ModelSerializer):
    references = ReferenceSerializer(many=True, read_only=True)

    class Meta:
        model = LiteratureQcRun
        fields = [
            "id",
            "question",
            "status",
            "novelty_signal",
            "confidence",
            "summary",
            "query_plan",
            "scoring_breakdown",
            "references",
            "started_at",
            "completed_at",
            "created_at",
        ]
