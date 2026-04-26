#!/bin/bash
set -e

echo "=== Step 1: Running migrations ==="
python manage.py migrate --noinput
echo "✓ Migrations complete"

echo "=== Step 2: Collecting static files ==="
python manage.py collectstatic --noinput
echo "✓ Static files collected"

echo "=== Pre-deploy complete ==="
