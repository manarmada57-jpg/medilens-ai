# ==============================================================================
# MediLens AI Backend — Multi-stage Production Dockerfile
# Base: Python 3.12 Slim Debian
# ==============================================================================

# Stage 1: Build & Wheels
FROM python:3.12-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Final Runtime
FROM python:3.12-slim AS runner

WORKDIR /app

# Install runtime dependencies for OCR and image processing (Phase 4-7 prep)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-hin \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root system user
RUN useradd -m -u 1001 -s /bin/bash appuser

# Copy installed wheels from builder
COPY --from=builder /root/.local /home/appuser/.local

# Ensure path includes user local bin
ENV PATH=/home/appuser/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Create required directories with proper permissions
RUN mkdir -p /tmp/medilens/uploads && chown -R appuser:appuser /tmp/medilens

# Copy application source code
COPY --chown=appuser:appuser app ./app
COPY --chown=appuser:appuser scripts ./scripts
COPY --chown=appuser:appuser pyproject.toml .env.example ./

USER appuser

EXPOSE 8000

# Docker healthcheck hitting liveness probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
