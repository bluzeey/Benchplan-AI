# BenchPlan AI

BenchPlan AI is a research-operations MVP that turns a scientific hypothesis into an evidence-grounded experimental plan with literature QC, budget/timeline estimation, and scientist feedback capture.

## Stack

- Backend: Django + DRF + PostgreSQL (pgvector) + Celery/Redis
- Frontend: React + TypeScript + Vite + Tailwind

## Literature source behavior

- If `SEMANTIC_SCHOLAR_API_KEY` is set, Semantic Scholar is used for paper search.
- If no Semantic Scholar key is provided (or Semantic search fails/returns empty), OpenAlex is used as fallback.

## Quick start

1. Copy environment file:

```bash
cp .env.example .env
```

2. Start services:

```bash
docker compose up --build
```

3. Run migrations:

```bash
docker compose exec backend python manage.py migrate
```

4. Open apps:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000/api/health/`
- OpenAPI schema: `http://localhost:8000/api/schema/`

## Demo flow

1. Create project with hypothesis
2. Run literature QC
3. Generate plan
4. Review and annotate corrections
5. Export markdown and CSV artifacts
# Production migration

The public frontend stays on Vercel. Production browser requests use the same
origin's `/api` routes; `frontend/vercel.json` forwards them to the Coolify API
at `https://benchplan-api.granveo.com`. Keep that rule before the SPA fallback.
`VITE_API_BASE_URL` is used for local development only. For a local same-origin
test, set it to an empty string and set `DEV_API_PROXY_TARGET` to the local API
or private SSH tunnel. API responses and signed file locations must not be cached.

Anyone can register and sign in, and each account can access only its own
projects, runs, plans, reviews, exports and files. Signup/login also require the
CSRF token returned by `/api/csrf/`. The public landing page carries a draft
through sign-in without starting paid work. New projects require explicit review
and creation. Existing owner-null projects are never automatically claimed.

Keep `DJANGO_DEBUG=false`, a strong private `DJANGO_SECRET_KEY`, explicit
`DJANGO_ALLOWED_HOSTS`, secure cookies and `CELERY_TASK_ALWAYS_EAGER=false` in
production. Enable `TRUST_PROXY_HEADERS` only behind an ingress that replaces
forwarded-protocol headers. Preserve existing accounts and attachments during
database handoff; do not replay copied Redis jobs. R2 files stay private and use
owner-checked, short-lived download links. Provider credentials remain server-side.

Backend offline checks use `backend/config/test_settings.py` and
`backend/requirements-test.txt`; see `backend/tests/README.md`. The backend is
pinned to the [Django 5.2.18 security release](https://www.djangoproject.com/weblog/2026/oct/06/security-releases/).
