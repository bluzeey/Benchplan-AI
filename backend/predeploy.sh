#!/bin/bash
set -e

echo "=== Step 1: Resetting database ==="
python -c "
import psycopg2
import os
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()
cur.execute('DROP SCHEMA IF EXISTS public CASCADE;')
cur.execute('CREATE SCHEMA public;')
cur.execute('GRANT ALL ON SCHEMA public TO postgres;')
conn.commit()
cur.close()
conn.close()
print('Database reset successful')
"
echo "✓ Database reset"

echo "=== Step 2: Running migrations ==="
python manage.py migrate --noinput
echo "✓ Migrations complete"

echo "=== Step 3: Collecting static files ==="
python manage.py collectstatic --noinput
echo "✓ Static files collected"

echo "=== Pre-deploy complete ==="
