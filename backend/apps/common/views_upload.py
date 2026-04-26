import uuid
import mimetypes
from datetime import datetime, timedelta
from pathlib import Path

import boto3
from botocore.config import Config
from django.conf import settings
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


class PresignedUploadView(APIView):
    """Generate presigned URL for direct upload to Cloudflare R2."""
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        filename = request.data.get("filename")
        content_type = request.data.get("content_type", "application/octet-stream")
        size = request.data.get("size", 0)
        
        if not filename:
            return Response(
                {"error": "filename is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file size (25MB max)
        max_size = 25 * 1024 * 1024
        if size > max_size:
            return Response(
                {"error": "File size exceeds 25MB limit"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate unique object key
        ext = Path(filename).suffix.lower()
        object_key = f"uploads/{request.user.id}/{uuid.uuid4()}{ext}"
        
        # Initialize S3 client for R2
        s3_config = Config(
            signature_version="s3v4",
            region_name="auto",
        )
        
        s3_client = boto3.client(
            "s3",
            endpoint_url=settings.R2_ENDPOINT,
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            config=s3_config,
        )
        
        # Generate presigned URL for PUT
        try:
            presigned_url = s3_client.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": settings.R2_BUCKET_NAME,
                    "Key": object_key,
                    "ContentType": content_type,
                },
                ExpiresIn=300,  # 5 minutes
            )
            
            # Construct the public URL for the file
            public_url = f"{settings.R2_PUBLIC_URL}/{object_key}"
            
            return Response({
                "upload_url": presigned_url,
                "file_url": public_url,
                "object_key": object_key,
                "expires_in": 300,
            })
        except Exception as e:
            return Response(
                {"error": f"Failed to generate upload URL: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
