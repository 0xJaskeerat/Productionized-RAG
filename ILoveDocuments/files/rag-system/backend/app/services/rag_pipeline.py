"""
rag_pipeline.py — Orchestrator. Wires all services together.

Two public functions:
  ingest_document() — called when user uploads a file
  query_documents() — called when user asks a question

This is the ONLY file that touches multiple services.
Routers call this. Services don't call each other.
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import AsyncGenerator, Optional, List

from app.services.chunker import extract_text, chunk_document
from app.services.embeddings import get_embeddings
from app.services.vectorstore import (
    upsert_chunks, similarity_search, delete_document,
    get_all_documents, get_collection_count
)
from app.services.llm import stream_answer
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


# ── INGESTION PIPELINE ────────────────────────────────────────────────────────

async def ingest_document(file_bytes: bytes, filename: str) -> dict:
    """
    Full ingestion pipeline:
    bytes → extract text → chunk → embed → store in ChromaDB

    Called once per upload. Returns metadata stored for the document.
    """
    doc_id = str(uuid.uuid4())
    file_type = filename.rsplit(".", 1)[-1].lower()
    uploaded_at = datetime.now(timezone.utc).isoformat()

    logger.info(f"[INGEST] Starting: {filename} ({doc_id})")

    # Step 1: Extract raw text from file
    text = extract_text(file_bytes, filename)

    # Step 2: Split text into overlapping token-bounded chunks
    chunks = chunk_document(text, doc_id, filename)

    # Inject additional metadata that wasn't available in chunker
    for chunk in chunks:
        chunk["metadata"]["file_type"] = file_type
        chunk["metadata"]["uploaded_at"] = uploaded_at

    # Step 3: Embed all chunks in one batched call (or loop for Ollama)
    texts_to_embed = [c["text"] for c in chunks]
    embeddings = await get_embeddings(texts_to_embed)

    # Step 4: Store vectors + text + metadata in ChromaDB
    await upsert_chunks(chunks, embeddings)

    logger.info(f"[INGEST] Done: {len(chunks)} chunks stored for {filename}")

    return {
        "doc_id":         doc_id,
        "filename":       filename,
        "file_type":      file_type,
        "chunks_created": len(chunks),
        "uploaded_at":    uploaded_at,
    }


# ── QUERY PIPELINE ────────────────────────────────────────────────────────────

async def query_documents(
    query: str,
    doc_ids: Optional[List[str]] = None,
) -> AsyncGenerator[dict, None]:
    """
    Full RAG query pipeline — yields SSE-compatible dicts.

    Yields in this order:
      1. {"sources": [...]}         — retrieved chunks shown as citations
      2. {"token": "..."}           — streamed LLM tokens (many of these)
      3. {"error": "..."}           — only if something went wrong

    Why yield sources first?
    FE can render citations immediately while LLM is still generating.
    """

    # Step 1: Embed the query using the SAME model used at index time
    query_embeddings = await get_embeddings([query])
    query_vector = query_embeddings[0]

    # Step 2: Retrieve top candidates from ChromaDB
    # Cast a wider net (RERANK_CANDIDATES) then filter by threshold
    raw_chunks = await similarity_search(
        query_embedding=query_vector,
        top_k=settings.RERANK_CANDIDATES,
        doc_ids=doc_ids,
    )

    # Step 3: Filter by minimum similarity score
    # Chunks below threshold are likely irrelevant — don't feed garbage to LLM
    relevant = [c for c in raw_chunks if c["score"] >= settings.MIN_SCORE_THRESHOLD]

    if not relevant:
        yield {"error": "No relevant content found. Try rephrasing your question or check that the right documents are uploaded."}
        return

    # Take top K after filtering (already sorted by score desc from ChromaDB)
    top_chunks = relevant[:settings.TOP_K]

    logger.info(
        f"[QUERY] '{query[:60]}...' → {len(raw_chunks)} candidates, "
        f"{len(relevant)} above threshold, using top {len(top_chunks)}"
    )

    # Step 4: Emit sources FIRST so FE renders citations immediately
    yield {
        "sources": [
            {
                "filename":    c["metadata"]["filename"],
                "doc_id":      c["metadata"]["doc_id"],
                "chunk_index": c["metadata"]["chunk_index"],
                "score":       c["score"],
                "preview":     c["metadata"].get("preview", c["text"][:250]),
            }
            for c in top_chunks
        ]
    }

    # Step 5: Stream the LLM answer token by token
    async for token in stream_answer(query, top_chunks):
        yield {"token": token}


# ── DOCUMENT MANAGEMENT ───────────────────────────────────────────────────────

async def list_documents() -> list:
    return await get_all_documents()


async def remove_document(doc_id: str) -> int:
    return await delete_document(doc_id)


def get_stats() -> dict:
    return {
        "total_chunks": get_collection_count(),
        "llm_provider": settings.LLM_PROVIDER,
    }
