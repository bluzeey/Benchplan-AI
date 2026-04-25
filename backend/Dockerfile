FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install Python dependencies
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . /app

# Create directories for static and media files
RUN mkdir -p /app/staticfiles /app/media

# Collect static files (will be served by whitenoise)
# Note: This requires environment variables to be set at build time or run time
# Railway will run collectstatic as part of the deployment process if configured

# Expose port
EXPOSE 8000

# Run gunicorn (migrations/static are handled by pre-deploy command)
# Railway sets the PORT environment variable automatically
CMD ["sh", "-c", "gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 120 --access-logfile - --error-logfile - --log-level info"]
