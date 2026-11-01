"""Offline tests only. Run with a clean environment (see tests/README.md)."""

from .settings import *  # noqa: F403

SECRET_KEY = "offline-test-key"
DEBUG = False
ALLOWED_HOSTS = ["testserver", "localhost"]
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
# Optional synthetic PostgreSQL instance: private local socket, never an app DSN.
_test_socket = os.environ.get("BENCH_TEST_PG_SOCKET")  # noqa: F405
if _test_socket:
    _socket_path = Path(_test_socket)  # noqa: F405
    assert _socket_path.is_absolute() and _socket_path == _socket_path.resolve()
    assert _socket_path.name == "socket" and _socket_path.parent.parent == Path("/private/tmp")  # noqa: F405
    assert _socket_path.parent.name.startswith("bench-pg-test-")
    assert _socket_path.stat().st_mode & 0o077 == 0
    DATABASES = {"default": {
        "ENGINE": "django.db.backends.postgresql", "NAME": "bench_privacy",
        "USER": "bench_test_admin", "HOST": _test_socket, "PORT": "55435",
        "TEST": {"NAME": "test_bench_privacy"},
    }}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
STATICFILES_STORAGE = "django.contrib.staticfiles.storage.StaticFilesStorage"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
CELERY_BROKER_URL = "memory://"
CELERY_RESULT_BACKEND = "cache+memory://"
CELERY_TASK_ALWAYS_EAGER = False
FIREWORKS_API_KEY = "offline-test-placeholder"
FIREWORKS_BASE_URL = "https://provider.invalid/v1"
SERPER_API_KEY = ""
R2_ENDPOINT = "https://storage.invalid"
R2_ACCESS_KEY_ID = "offline-test-placeholder"
R2_SECRET_ACCESS_KEY = "offline-test-placeholder"
R2_BUCKET_NAME = "offline-tests"
R2_PUBLIC_URL = "https://storage.invalid/offline-tests"
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SECURE_SSL_REDIRECT = False
MIDDLEWARE = [item for item in MIDDLEWARE if item != "whitenoise.middleware.WhiteNoiseMiddleware"]  # noqa: F405
