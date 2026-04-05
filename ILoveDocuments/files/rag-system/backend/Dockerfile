# ── Stage 1: Builder ──────────────────────────────────────────────────────────
# Install deps in a separate stage so they don't pollute the final image
FROM python:3.12-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y gcc g++ && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# Copy installed packages from builder (keeps image small)
COPY --from=builder /install /usr/local

# Copy application source
COPY app/ ./app/

# Non-root user — never run prod containers as root
RUN useradd -m -u 1000 appuser && chown -R appuser /app
USER appuser

# ChromaDB data directory (will be mounted as Docker volume)
RUN mkdir -p /data/chroma

EXPOSE 8000

# 2 workers: good for I/O-bound workloads (embedding API calls, LLM streaming)
# Increase to 4 if you have >4 CPU cores
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--log-level", "info"]
