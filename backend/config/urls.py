from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.common.views import HealthCheckView
from apps.common.views_upload import PresignedUploadView


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", HealthCheckView.as_view(), name="health"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/uploads/presign/", PresignedUploadView.as_view(), name="upload-presign"),
    path("api/", include("apps.accounts.urls")),
    path("api/", include("apps.projects.urls")),
    path("api/", include("apps.literature.urls")),
    path("api/", include("apps.planning.urls")),
    path("api/", include("apps.feedback.urls")),
    path("api/", include("apps.agents.urls")),
    path("api/", include("apps.exports.urls")),
    path("api/", include("apps.safety.urls")),
]
