from django.utils.cache import patch_vary_headers


class PrivateApiResponsesMiddleware:
    """Keep session-specific API data and signed locations out of shared caches."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path == "/api" or request.path.startswith("/api/"):
            response["Cache-Control"] = "private, no-store"
            response["CDN-Cache-Control"] = "no-store"
            response["Vercel-CDN-Cache-Control"] = "no-store"
            response["Pragma"] = "no-cache"
            response["Referrer-Policy"] = "no-referrer"
            patch_vary_headers(response, ("Cookie", "Origin"))
        return response
