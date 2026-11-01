import uuid
from pathlib import Path

import boto3
from django.conf import settings
from django.http import Http404
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .private_storage import (
    file_redirect, private_upload_url, protect_file_response, storage_client_options,
    validate_attachment_size, validate_owned_upload_key, validate_upload_key,
)


class PrivateFileView(APIView):
    """Preview a new upload in its owner's namespace, before project creation."""

    permission_classes = [IsAuthenticated]

    def finalize_response(self, request, response, *args, **kwargs):
        return protect_file_response(super().finalize_response(request, response, *args, **kwargs))

    def get(self, request):
        try:
            key = validate_owned_upload_key(request.query_params.get("object_key"), request.user)
        except ValueError:
            raise Http404
        return file_redirect(
            key, request.query_params.get("name", "attachment"),
            request.query_params.get("content_type", ""),
            inline=request.query_params.get("view") == "1",
        )


class PresignedUploadView(APIView):
    """Generate presigned URL for direct upload to Cloudflare R2."""
    
    permission_classes = [IsAuthenticated]

    def finalize_response(self, request, response, *args, **kwargs):
        return protect_file_response(super().finalize_response(request, response, *args, **kwargs))
    
    def post(self, request):
        filename = request.data.get("filename")
        content_type = request.data.get("content_type", "application/octet-stream")
        size = request.data.get("size")
        
        if not isinstance(filename, str) or not filename or len(filename) > 255:
            return Response(
                {"error": "filename is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            validate_attachment_size(size)
            if not isinstance(content_type, str) or len(content_type) > 128 or any(ord(c) < 32 for c in content_type):
                raise ValueError("Invalid content type.")
            # Match the original UUID + suffix naming scheme.
            ext = Path(filename).suffix.lower()
            object_key = validate_upload_key(f"uploads/{request.user.pk}/{uuid.uuid4()}{ext}", request.user)
        except ValueError as exc:
            return Response(
                {"error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate presigned URL for PUT
        try:
            s3_client = boto3.client("s3", **storage_client_options())
            presigned_url = s3_client.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": settings.R2_BUCKET_NAME,
                    "Key": object_key,
                    "ContentType": content_type,
                },
                ExpiresIn=300,  # 5 minutes
            )
            
            return Response({
                "upload_url": presigned_url,
                "file_url": private_upload_url(object_key, filename, content_type),
                "object_key": object_key,
                "expires_in": 300,
            })
        except Exception:
            return Response(
                {"error": "Failed to generate upload URL."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
