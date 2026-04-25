# BenchPlan AI

BenchPlan AI is a research-operations MVP that turns a scientific hypothesis into an evidence-grounded experimental plan with literature QC, budget/timeline estimation, and scientist feedback capture.

## Stack

- Backend: Django + DRF + PostgreSQL (pgvector) + Celery/Redis
- Frontend: React + TypeScript + Vite + Tailwind

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
