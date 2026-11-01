import pytest
from rest_framework.test import APIClient


@pytest.mark.django_db
@pytest.mark.parametrize("path", ["/api/health/", "/api/csrf/", "/api/auth/me/", "/api/projects/", "/api/not-found/"])
def test_api_success_and_error_responses_cannot_be_shared_cached(path):
    response = APIClient().get(path)
    assert response["Cache-Control"] == "private, no-store"
    assert response["CDN-Cache-Control"] == response["Vercel-CDN-Cache-Control"] == "no-store"
    assert response["Referrer-Policy"] == "no-referrer"
    assert {"cookie", "origin"} <= {value.strip().lower() for value in response["Vary"].split(",")}
