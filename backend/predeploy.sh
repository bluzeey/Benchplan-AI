#!/bin/bash
set -e

echo "=== Step 1: Resetting database ==="
echo 'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres;' | python manage.py dbshell
echo "✓ Database reset"

echo "=== Step 2: Running migrations ==="
python manage.py migrate --noinput
echo "✓ Migrations complete"

echo "=== Step 3: Collecting static files ==="
python manage.py collectstatic --noinput
echo "✓ Static files collected"

echo "=== Pre-deploy complete ==="
