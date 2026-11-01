from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated

from apps.agents.availability import AI_UNAVAILABLE_MESSAGE, is_ai_available


class HealthCheckView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "ok"})


class CapabilitiesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        available = is_ai_available()
        return Response({
            "ai_available": available,
            "message": None if available else AI_UNAVAILABLE_MESSAGE,
        })
