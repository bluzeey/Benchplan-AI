from django.http import JsonResponse
from django.middleware.csrf import get_token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny


@api_view(["GET"])
@permission_classes([AllowAny])
def csrf_token_view(request):
    """Get CSRF token for authenticated requests."""
    return JsonResponse({"csrfToken": get_token(request)})
