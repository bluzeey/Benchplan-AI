"""Attachment authorization/signing tests: synthetic DB/storage, sockets disabled."""

import socket
from types import SimpleNamespace
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit
from uuid import uuid4

import pytest
from django.apps import apps
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.db import connection, transaction, DataError
from pytest_socket import SocketBlockedError
from rest_framework.test import APIClient

from apps.common.private_storage import MAX_ATTACHMENT_SIZE
from apps.projects.models import Project, ProjectAttachment


@pytest.fixture
def files(db, external_calls):
    owner = get_user_model().objects.create_user(username="file-owner", email="owner@example.invalid")
    other = get_user_model().objects.create_user(username="file-other", email="other@example.invalid")
    own_project = Project.objects.create(owner=owner, title="Owner project")
    foreign_project = Project.objects.create(owner=other, title="Foreign project")
    legacy_project = Project.objects.create(owner=None, title="Legacy project")

    def attachment(project, key_user):
        key = f"uploads/{key_user.pk}/{uuid4()}.pdf"
        return ProjectAttachment.objects.create(
            project=project, name="original.pdf", object_key=key, size=42,
            content_type="application/pdf", url=f"https://old-public.invalid/{key}",
        )

    own = attachment(own_project, owner)
    foreign = attachment(foreign_project, other)
    legacy = attachment(legacy_project, owner)
    tainted = attachment(own_project, other)
    foreign_in_namespace = attachment(foreign_project, owner)
    client = APIClient()
    client.force_authenticate(owner)
    external_calls.storage.return_value.generate_presigned_url.return_value = "https://storage.invalid/file?signature=offline"
    return SimpleNamespace(**locals())


def snapshot():
    return {
        model._meta.label: list(model.objects.order_by("pk").values())
        for model in apps.get_models()
        if model._meta.app_label in {"projects", "literature", "planning", "agents", "feedback", "safety"}
    }


def no_external_calls(external_calls):
    for mock in vars(external_calls).values():
        mock.assert_not_called()


def download_url(attachment):
    return reverse("project-attachment-download", kwargs={"attachment_id": attachment.pk})


def assert_private(response):
    # Parent's API middleware may normalize this header to "private, no-store".
    directives = {value.strip() for value in response["Cache-Control"].split(",")}
    assert {"private", "no-store"} <= directives
    assert "public" not in directives
    assert response["Referrer-Policy"] == "no-referrer"
    assert response["X-Content-Type-Options"] == "nosniff"


def create_payload(files, **changes):
    att = {
        "name": "notes.pdf", "object_key": f"uploads/{files.owner.pk}/{uuid4()}.pdf",
        "size": 42, "type": "application/pdf", "url": "https://untrusted.invalid/forged",
    }
    att.update(changes)
    # No title: invalid attachment validation must precede title/provider work.
    return {"hypothesis": "A sufficiently detailed synthetic research hypothesis for offline tests.", "attachments": [att]}


def test_sockets_are_disabled():
    with pytest.raises(SocketBlockedError):
        socket.socket()


@pytest.mark.parametrize("route", ["saved", "preview"])
@pytest.mark.parametrize("access", ["anonymous", "own", "foreign", "legacy", "tainted", "foreign_in_namespace"])
def test_owner_and_project_boundary_precedes_storage(files, external_calls, route, access):
    attachment = files.own if access == "anonymous" else getattr(files, access)
    client = APIClient() if access == "anonymous" else files.client
    before = snapshot()
    if route == "saved":
        response = client.get(download_url(attachment))
    else:
        response = client.get(reverse("upload-file"), {"object_key": attachment.object_key})
    assert response.status_code == (403 if access == "anonymous" else 302 if access == "own" else 404)
    assert_private(response)
    assert snapshot() == before
    if access != "own":
        no_external_calls(external_calls)
    else:
        signed = external_calls.storage.return_value.generate_presigned_url.call_args
        assert signed.args == ("get_object",)
        assert signed.kwargs["Params"]["Key"] == files.own.object_key
        assert signed.kwargs["ExpiresIn"] == 60


BAD_KEYS = [
    None, "", 12, True, [], {}, "file.pdf", "/uploads/{owner}/file.pdf",
    "uploads/{other}/file.pdf", "uploads/{owner}0/file.pdf", "uploads/{owner}/",
    "uploads/{owner}/../file.pdf", "uploads/{owner}/./file.pdf", "uploads/{owner}//file.pdf",
    "uploads/{owner}/nested/../../file.pdf", "uploads/{owner}/%2e%2e/file.pdf",
    "uploads/{owner}/%252e%252e/file.pdf", "uploads/{owner}/x%2ffile.pdf",
    "uploads/{owner}/x\\file.pdf", "uploads/{owner}/file.pdf?x=1", "uploads/{owner}/file.pdf#x",
    "uploads/{owner}/file\x00.pdf", "uploads/{owner}/file\r\n.pdf", "uploads/{owner}/file\u202e.pdf",
    "uploads/{owner}/" + "a" * 513,
]


def key_value(value, files):
    return value.format(owner=files.owner.pk, other=files.other.pk) if isinstance(value, str) else value


@pytest.mark.parametrize("value", BAD_KEYS)
@pytest.mark.parametrize("route", ["saved", "preview"])
def test_malformed_and_foreign_keys_fail_closed(files, external_calls, value, route):
    key = key_value(value, files)
    if route == "saved":
        # Non-string persisted CharField values are stringified by Django.
        original_key = files.own.object_key
        files.own.object_key = "" if key is None else str(key)
        if connection.vendor == "postgresql" and (
            "\x00" in files.own.object_key or len(files.own.object_key) > 512
        ):
            # PostgreSQL itself rejects these states, before a file can be read.
            with pytest.raises(DataError):
                with transaction.atomic():
                    files.own.save(update_fields=["object_key"])
            files.own.refresh_from_db()
            assert files.own.object_key == original_key
            no_external_calls(external_calls)
            return
        files.own.save(update_fields=["object_key"])
        response = files.client.get(download_url(files.own))
    else:
        # Encode malformed JSON-like values as strings, as a URL query would.
        params = {} if key is None else {"object_key": str(key)}
        response = files.client.get(reverse("upload-file"), params)
    assert response.status_code == 404
    assert_private(response)
    no_external_calls(external_calls)


@pytest.mark.parametrize("value", BAD_KEYS)
def test_forged_attachment_keys_rejected_before_title_or_writes(files, external_calls, value):
    payload = create_payload(files, object_key=key_value(value, files))
    # Even a valid first item must not be persisted before all items validate.
    payload["attachments"].insert(0, create_payload(files)["attachments"][0])
    before = snapshot()
    with patch("apps.projects.serializers.ProjectCreateSerializer._generate_project_title") as title:
        response = files.client.post(reverse("project-list"), payload, format="json")
        title.assert_not_called()
    assert response.status_code == 400
    assert snapshot() == before
    no_external_calls(external_calls)


@pytest.mark.parametrize("linked", ["legacy", "foreign_in_namespace"])
def test_reattaching_existing_keys_cannot_bypass_project_ownership(files, external_calls, linked):
    key = getattr(files, linked).object_key
    payload = create_payload(files, object_key=key)
    before = snapshot()
    with patch("apps.projects.serializers.ProjectCreateSerializer._generate_project_title") as title:
        response = files.client.post(reverse("project-list"), payload, format="json")
        title.assert_not_called()
    assert response.status_code == 400
    assert snapshot() == before
    no_external_calls(external_calls)


def test_preexisting_duplicate_key_does_not_hide_foreign_project_link(files, external_calls):
    files.own.object_key = files.legacy.object_key
    files.own.save(update_fields=["object_key"])
    assert files.client.get(download_url(files.own)).status_code == 404
    no_external_calls(external_calls)


@pytest.mark.parametrize("size", [-1, MAX_ATTACHMENT_SIZE + 1, 1.5, 1.0, True, False, "42", None, [], {}])
@pytest.mark.parametrize("route", ["project", "upload"])
def test_invalid_sizes_have_no_side_effects(files, external_calls, size, route):
    before = snapshot()
    payload = create_payload(files, size=size) if route == "project" else {"filename": "file.pdf", "size": size}
    endpoint = "project-list" if route == "project" else "upload-presign"
    with patch("apps.projects.serializers.ProjectCreateSerializer._generate_project_title") as title:
        response = files.client.post(reverse(endpoint), payload, format="json")
        title.assert_not_called()
    assert response.status_code == 400
    assert snapshot() == before
    no_external_calls(external_calls)


@pytest.mark.parametrize("field", ["object_key", "size", "name"])
def test_missing_attachment_metadata_is_rejected(files, external_calls, field):
    payload = create_payload(files)
    del payload["attachments"][0][field]
    before = snapshot()
    response = files.client.post(reverse("project-list"), payload, format="json")
    assert response.status_code == 400
    assert snapshot() == before
    no_external_calls(external_calls)


@pytest.mark.parametrize("suffix", ["", ".pdf", ".png", ".jpeg", ".docx", ".xlsx", ".md", ".tiff", ".TXT", ".研究"])
def test_original_uuid_key_shapes_remain_downloadable(files, external_calls, suffix):
    files.own.object_key = f"uploads/{files.owner.pk}/{uuid4()}{suffix}"
    files.own.save(update_fields=["object_key"])
    response = files.client.get(download_url(files.own))
    assert response.status_code == 302
    params = external_calls.storage.return_value.generate_presigned_url.call_args.kwargs["Params"]
    assert params["Key"] == files.own.object_key


def test_original_db_urls_untouched_but_all_serialized_links_private(files, external_calls):
    before = snapshot()
    responses = [
        files.client.get(reverse("project-list")),
        files.client.get(reverse("project-detail", kwargs={"pk": files.own_project.pk})),
        files.client.get(reverse("project-attachment-list", kwargs={"project_id": files.own_project.pk})),
    ]
    for response in responses:
        assert response.status_code == 200
        assert b"old-public.invalid" not in response.content
    rows = [responses[0].json()[0]["attachments"], responses[1].json()["attachments"], responses[2].json()]
    for attachments in rows:
        own_row = next(row for row in attachments if row["id"] == str(files.own.pk))
        assert own_row["url"] == download_url(files.own)
    assert snapshot() == before
    no_external_calls(external_calls)


@pytest.mark.parametrize("size", [0, MAX_ATTACHMENT_SIZE])
def test_new_attachment_ignores_client_url_and_downloads_its_own_key(files, external_calls, size):
    payload = create_payload(files, size=size, url=files.foreign.url)
    payload["title"] = "Explicit offline title"
    original_urls = dict(ProjectAttachment.objects.values_list("pk", "url"))
    response = files.client.post(reverse("project-list"), payload, format="json", HTTP_HOST="localhost")
    assert response.status_code == 201, response.content
    attachment = ProjectAttachment.objects.get(pk=response.json()["attachments"][0]["id"])
    assert attachment.project.owner == files.owner
    assert attachment.size == size
    assert attachment.url == "http://localhost" + download_url(attachment)
    attachment.full_clean()
    assert response.json()["attachments"][0]["url"] == download_url(attachment)
    assert dict(ProjectAttachment.objects.filter(pk__in=original_urls).values_list("pk", "url")) == original_urls
    no_external_calls(external_calls)
    # A forged query must not override the key on the authorized database row.
    response = files.client.get(download_url(attachment), {"object_key": files.foreign.object_key})
    assert response.status_code == 302
    assert external_calls.storage.return_value.generate_presigned_url.call_args.kwargs["Params"]["Key"] == attachment.object_key


@pytest.mark.parametrize("size", [0, MAX_ATTACHMENT_SIZE])
def test_upload_returns_working_private_preview_then_project_download(files, external_calls, size):
    before = snapshot()
    response = files.client.post(reverse("upload-presign"), {
        "filename": "Original.PNG", "content_type": "image/png", "size": size,
    }, format="json")
    assert response.status_code == 200
    assert_private(response)
    data = response.json()
    assert data["object_key"].startswith(f"uploads/{files.owner.pk}/")
    assert data["object_key"].endswith(".png")
    assert data["file_url"].startswith("/api/uploads/file/?")
    query = parse_qs(urlsplit(data["file_url"]).query)
    assert query["object_key"] == [data["object_key"]]
    signed = external_calls.storage.return_value.generate_presigned_url
    assert signed.call_args.args == ("put_object",)
    assert signed.call_args.kwargs["ExpiresIn"] == 300
    assert files.client.get(data["file_url"]).status_code == 302
    assert signed.call_args.args == ("get_object",)
    assert signed.call_args.kwargs["ExpiresIn"] == 60
    assert signed.call_args.kwargs["Params"]["ResponseContentType"] == "image/png"
    assert signed.call_args.kwargs["Params"]["ResponseContentDisposition"].startswith("inline;")
    assert snapshot() == before
    payload = create_payload(files, object_key=data["object_key"], url=data["file_url"], size=size)
    payload["title"] = "Upload project"
    created = files.client.post(reverse("project-list"), payload, format="json")
    assert created.status_code == 201
    assert files.client.get(created.json()["attachments"][0]["url"]).status_code == 302


@pytest.mark.parametrize("content_type", ["text/html", "image/svg+xml", "application/pdf", "application/octet-stream"])
def test_active_content_never_renders_inline(files, external_calls, content_type):
    response = files.client.get(reverse("upload-file"), {
        "object_key": f"uploads/{files.owner.pk}/{uuid4()}.svg", "view": "1",
        "content_type": content_type, "name": "untrusted.svg",
    })
    assert response.status_code == 302
    params = external_calls.storage.return_value.generate_presigned_url.call_args.kwargs["Params"]
    assert params["ResponseContentDisposition"].startswith("attachment;")
    assert params["ResponseContentType"] == "application/octet-stream"


def test_disposition_is_controlled_and_signed_response_is_not_cached(files, external_calls):
    files.own.name = '../résumé";\r\nX-Injected: yes.pdf'
    files.own.save(update_fields=["name"])
    response = files.client.get(download_url(files.own))
    assert response.status_code == 302
    assert_private(response)
    signed = external_calls.storage.return_value.generate_presigned_url.call_args
    assert signed.args == ("get_object",)
    assert signed.kwargs["ExpiresIn"] == 60
    params = signed.kwargs["Params"]
    assert params["Bucket"] == "offline-tests"
    assert params["ResponseCacheControl"] == "private, no-store, max-age=0"
    disposition = params["ResponseContentDisposition"]
    assert disposition.startswith('attachment; filename="')
    assert disposition.count('"') == 2
    assert "\r" not in disposition and "\n" not in disposition and "../" not in disposition
    assert "filename*=UTF-8''r%C3%A9sum%C3%A9" in disposition
    assert "X-Injected" not in response.headers


@pytest.mark.parametrize("route", ["saved", "preview", "upload"])
@pytest.mark.parametrize("failure", ["client", "sign"])
def test_storage_failures_are_generic_and_not_cached(files, external_calls, route, failure):
    secret = "synthetic-secret-key signature=do-not-expose endpoint=private.invalid"
    if failure == "client":
        external_calls.storage.side_effect = RuntimeError(secret)
    else:
        external_calls.storage.return_value.generate_presigned_url.side_effect = RuntimeError(secret)
    if route == "upload":
        response = files.client.post(reverse("upload-presign"), {"filename": "test.txt", "size": 1}, format="json")
    elif route == "preview":
        response = files.client.get(reverse("upload-file"), {"object_key": files.own.object_key})
    else:
        response = files.client.get(download_url(files.own))
    assert response.status_code == (500 if route == "upload" else 503)
    assert_private(response)
    assert secret not in response.content.decode()
    assert "synthetic-secret" not in str(response.headers)


def test_session_authenticated_download_and_missing_record(files, external_calls):
    client = APIClient(enforce_csrf_checks=True)
    client.force_login(files.owner)
    assert client.get(download_url(files.own)).status_code == 302
    external_calls.storage.reset_mock()
    assert client.get(reverse("project-attachment-download", kwargs={"attachment_id": uuid4()})).status_code == 404
    no_external_calls(external_calls)
