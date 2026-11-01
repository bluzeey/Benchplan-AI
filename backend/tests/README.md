# Offline backend tests

Use an isolated virtual environment with `requirements-test.txt` installed from
PyPI. From this backend directory, run with a clean environment; do not source an
application environment file:

```sh
env -i PATH=/private/tmp/bench-privacy-test-venv/bin:/usr/bin:/bin \
  /private/tmp/bench-privacy-test-venv/bin/python -m pytest -q
```

Pytest uses `config.test_settings`: in-memory SQLite, synthetic provider/storage
configuration, and an in-memory broker. Provider methods, task publication and
storage clients are mocked for all tests. `pytest-socket` disables sockets,
including accidental provider/network requests. No production configuration,
database, broker, credentials or services are needed. This does not validate
PostgreSQL-specific behavior or deployment/session integration across origins.
