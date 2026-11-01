"""A production process must not silently start with a development signing key."""
import os
import subprocess
import sys

import pytest


@pytest.mark.parametrize("key", [None, "dev-secret-key", "a" * 64, "django-insecure-" + "Abc123_-" * 8])
def test_production_settings_reject_default_or_weak_signing_secret(key):
    task_env = {"PATH": os.path.dirname(sys.executable) + ":/usr/bin:/bin", "DJANGO_DEBUG": "false"}
    if key is not None:
        task_env["DJANGO_SECRET_KEY"] = key
    result = subprocess.run([sys.executable, "-c", "import config.settings"], env=task_env,
                            capture_output=True, timeout=10)
    assert result.returncode != 0
    assert b"Configure a strong private DJANGO_SECRET_KEY" in result.stderr
    if key:
        assert key.encode() not in result.stderr


def test_production_settings_accept_configured_private_signing_secret():
    task_env = {"PATH": os.path.dirname(sys.executable) + ":/usr/bin:/bin", "DJANGO_DEBUG": "false",
                "DJANGO_SECRET_KEY": "SyntheticOfflineSigningSecret-" + "Abc123_-" * 8}
    result = subprocess.run([sys.executable, "-c", "import config.settings"], env=task_env,
                            capture_output=True, timeout=10)
    assert result.returncode == 0
    assert not result.stdout
