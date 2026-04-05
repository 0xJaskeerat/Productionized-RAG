"""
main.py — FastAPI application entry point.

Architecture: Clean Architecture / Layered
  main.py (app setup)
    ↓
  routers/ (HTTP layer — handles requests/responses)
    ↓
  services/rag_pipeline.py (orchestration layer)
    ↓
  services/{chunker, embeddings, vectorstore, llm}.py (domain services)

No layer calls above itself. Routers never import services directly
(except rag_pipeline which is the single orchestrator).
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import ingest, query, health
from app.middleware.logging_middleware import LoggingMiddleware
from app.config import get_settings

# ── Logging setup ─────────────────────────────────────────────────────────────
settings = get_settings()
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="RAG System API",
    version="1.0.0",
    description="Production RAG system: upload documents, query with AI",
    docs_url="/docs",       # Swagger UI at /docs
    redoc_url="/redoc",     # ReDoc at /redoc
)

# ── Middleware ────────────────────────────────────────────────────────────────
app.add_middleware(LoggingMiddleware)

# CORS — restrict origins in production!
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # local dev (Vite/CRA)
        "http://localhost:80",
        "http://frontend",         # Docker internal
        "http://frontend:80",
    ],
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health.router)
app.include_router(ingest.router)
app.include_router(query.router)
