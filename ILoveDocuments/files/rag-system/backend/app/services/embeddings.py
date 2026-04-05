"""
embeddings.py — Embedding model abstraction.

IRON RULE: The model used at INDEX time MUST be identical at QUERY time.
Switching models without re-indexing = garbage retrieval.
"""

import logging
from typing import List
import httpx
from openai import AsyncOpenAI
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def get_embeddings(texts: List[str]) -> List[List[float]]:
    """Public interface — provider-agnostic."""
    if not texts:
        return []
    cleaned = [t.replace("\n", " ").strip() for t in texts]
    if settings.LLM_PROVIDER == "openai":
        return await _openai_embeddings(cleaned)
    return await _ollama_embeddings(cleaned)


async def _openai_embeddings(texts: List[str]) -> List[List[float]]:
    """Batched OpenAI embeddings. text-embedding-3-small = 1536 dims."""
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    all_embeddings = []
    for i in range(0, len(texts), 512):
        batch = texts[i:i + 512]
        response = await client.embeddings.create(
            model=settings.OPENAI_EMBEDDING_MODEL,
            input=batch,
        )
        all_embeddings.extend(item.embedding for item in response.data)
    return all_embeddings


async def _ollama_embeddings(texts: List[str]) -> List[List[float]]:
    """Ollama: one request per text (no batch support). nomic-embed-text = 768 dims."""
    embeddings = []
    async with httpx.AsyncClient(timeout=60.0) as client:
        for text in texts:
            r = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/embeddings",
                json={"model": settings.OLLAMA_EMBEDDING_MODEL, "prompt": text},
            )
            r.raise_for_status()
            embeddings.append(r.json()["embedding"])
    return embeddings
