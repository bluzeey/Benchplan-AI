"""Protect anonymous session creation from cross-site account/login requests."""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


def payload(endpoint):
    data = {"email": "login-check@example.invalid", "password": "offline-test-password"}
    if endpoint == "signup":
        data.update(email="signup-check@example.invalid", first_name="Offline", last_name="Test",
                    password_confirm=data["password"])
    return data


@pytest.fixture
def existing_user():
    return get_user_model().objects.create_user(
        username="login-check@example.invalid", email="login-check@example.invalid",
        password="offline-test-password")


@pytest.mark.parametrize("endpoint", ["signup", "login"])
@pytest.mark.parametrize("attempt", ["no-cookie", "no-header", "wrong-token", "foreign-origin"])
def test_anonymous_auth_rejects_csrf_before_creating_user_or_session(
        endpoint, attempt, existing_user, external_calls):
    client = APIClient(enforce_csrf_checks=True)
    headers = {}
    if attempt != "no-cookie":
        token = client.get("/api/csrf/").json()["csrfToken"]
        if attempt != "no-header":
            headers["HTTP_X_CSRFTOKEN"] = "a" * 64 if attempt == "wrong-token" else token
        if attempt == "foreign-origin":
            headers["HTTP_ORIGIN"] = "https://untrusted.invalid"
    before = get_user_model().objects.count()
    response = client.post(f"/api/auth/{endpoint}/", payload(endpoint), format="json", **headers)
    assert response.status_code == 403
    assert "CSRF" in response.json()["detail"]
    assert get_user_model().objects.count() == before
    assert client.get("/api/auth/me/").status_code == 403
    external_calls.generate_text.assert_not_called()
    external_calls.run_literature_qc_task.assert_not_called()
    external_calls.storage.assert_not_called()


@pytest.mark.parametrize("endpoint,expected", [("signup", 201), ("login", 200)])
def test_anonymous_auth_accepts_same_origin_token_and_rotates_session(
        endpoint, expected, existing_user):
    client = APIClient(enforce_csrf_checks=True)
    token = client.get("/api/csrf/").json()["csrfToken"]
    response = client.post(f"/api/auth/{endpoint}/", payload(endpoint), format="json",
                           HTTP_X_CSRFTOKEN=token, HTTP_ORIGIN="http://testserver")
    assert response.status_code == expected
    assert client.get("/api/auth/me/").json()["email"] == payload(endpoint)["email"]
    token = client.get("/api/csrf/").json()["csrfToken"]
    assert client.post("/api/auth/logout/", HTTP_X_CSRFTOKEN=token).status_code == 200
    assert client.get("/api/auth/me/").status_code == 403
