"""Private attachment links and bounded R2 signing; never trust a stored public URL."""

import mimetypes
import unicodedata
from urllib.parse import quote, urlencode

import boto3
from botocore.config import Config
from django.conf import settings
from django.http import HttpResponseRedirect
from django.urls import reverse
from rest_framework.response import Response

MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024
DOWNLOAD_TTL = 60
INLINE_TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp"}


def validate_upload_key(key, user):
    """Keep original filename/extension shapes, but reject ambiguous path syntax."""
    prefix = f"uploads/{user.pk}/"
    if (
        not user.is_authenticated
        or not isinstance(key, str)
        or len(key) > 512
        or not key.startswith(prefix)
        or any(c in key for c in "\\%?#")
        or any(unicodedata.category(c).startswith("C") for c in key)
        or any(part in {"", ".", ".."} for part in key.split("/"))
    ):
        raise ValueError("Invalid attachment key.")
    return key


def validate_attachment_size(size):
    if type(size) is not int or not 0 <= size <= MAX_ATTACHMENT_SIZE:
        raise ValueError("File size must be an integer between 0 and 25MB.")
    return size


def validate_owned_upload_key(key, user):
    key = validate_upload_key(key, user)
    from apps.projects.models import ProjectAttachment

    # Neither previews nor reattachment may bypass an existing project boundary.
    if ProjectAttachment.objects.filter(object_key=key).exclude(project__owner=user).exists():
        raise ValueError("Invalid attachment key.")
    return key


def storage_client_options():
    return {
        "endpoint_url": settings.R2_ENDPOINT,
        "aws_access_key_id": settings.R2_ACCESS_KEY_ID,
        "aws_secret_access_key": settings.R2_SECRET_ACCESS_KEY,
        "config": Config(signature_version="s3v4", region_name="auto"),
    }


def private_upload_url(key, name, content_type):
    return reverse("upload-file") + "?" + urlencode({
        "object_key": key, "name": name, "content_type": content_type, "view": "1",
    })


def private_attachment_url(attachment):
    return reverse("project-attachment-download", kwargs={"attachment_id": attachment.pk})


def protect_file_response(response):
    response["Cache-Control"] = "private, no-store, max-age=0"
    response["Pragma"] = "no-cache"
    response["Referrer-Policy"] = "no-referrer"
    response["X-Content-Type-Options"] = "nosniff"
    return response


def file_redirect(key, name, content_type, *, inline=False):
    # Only raster images may render inline; HTML/SVG/PDF and unknown types download.
    guessed_type = mimetypes.guess_type(name)[0]
    safe_type = content_type or guessed_type
    show_inline = inline and safe_type in INLINE_TYPES
    response_type = safe_type if show_inline else "application/octet-stream"
    name = name.replace("\\", "/").rsplit("/", 1)[-1]
    name = "".join(c for c in name if not unicodedata.category(c).startswith("C"))[:255]
    if name in {"", ".", ".."}:
        name = "attachment"
    fallback = "".join(c if c.isascii() and (c.isalnum() or c in " ._-") else "_" for c in name)
    disposition = "inline" if show_inline else "attachment"
    disposition += f'; filename="{fallback}"; filename*=UTF-8\'\'{quote(name, safe="")}'
    try:
        client = boto3.client("s3", **storage_client_options())
        signed_url = client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": settings.R2_BUCKET_NAME,
                "Key": key,
                "ResponseContentDisposition": disposition,
                "ResponseContentType": response_type,
                "ResponseCacheControl": "private, no-store, max-age=0",
            },
            ExpiresIn=DOWNLOAD_TTL,
        )
        return protect_file_response(HttpResponseRedirect(signed_url))
    except Exception:
        # Storage exceptions may contain endpoint/credential/signature details.
        return protect_file_response(Response({"error": "File is temporarily unavailable."}, status=503))
