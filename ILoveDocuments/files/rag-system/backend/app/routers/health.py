"""
health.py — Health check endpoint.
Docker, Kubernetes, and load balancers all ping this.
Returns 200 only when the app is fully ready.
"""
from fastapi import APIRouter
from app.services.rag_pipeline import get_stats
from app.models.schemas import HealthResponse
from app.config import get_settings

router = APIRouter(tags=["Health"])
settings = get_settings()


@router.get("/health", response_model=HealthResponse)
async def health():
    stats = get_stats()
    return HealthResponse(
        status="ok",
        llm_provider=settings.LLM_PROVIDER,
        vector_store="chromadb",
        documents_indexed=stats["total_chunks"],
    )
