"""
vectorstore.py — ChromaDB interface.

ChromaDB stores: vector + document text + metadata per chunk.
Query by vector similarity (cosine distance).

For production scale (>5M vectors): migrate to Pinecone, Weaviate, or pgvector.
ChromaDB is perfect for up to ~1M vectors.
"""

import logging
from typing import List, Optional
from functools import lru_cache

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


@lru_cache()
def _get_client() -> chromadb.ClientAPI:
    """Singleton ChromaDB client. PersistentClient saves to disk (Docker volume)."""
    return chromadb.PersistentClient(
        path=settings.CHROMA_PERSIST_DIR,
        settings=ChromaSettings(anonymized_telemetry=False),
    )


def _get_collection():
    """Get or create the main collection. cosine = standard for text similarity."""
    return _get_client().get_or_create_collection(
        name=settings.CHROMA_COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


async def upsert_chunks(chunks: List[dict], embeddings: List[List[float]]) -> None:
    """
    Upsert = insert or update. Safe to call multiple times (idempotent).
    ID format: {doc_id}_chunk_{index} — must be unique strings.
    """
    collection = _get_collection()

    ids       = [f"{c['metadata']['doc_id']}_chunk_{c['metadata']['chunk_index']}" for c in chunks]
    documents = [c["text"] for c in chunks]
    metadatas = [c["metadata"] for c in chunks]

    collection.upsert(ids=ids, embeddings=embeddings, documents=documents, metadatas=metadatas)
    logger.info(f"Upserted {len(chunks)} chunks into ChromaDB")


async def similarity_search(
    query_embedding: List[float],
    top_k: int = 5,
    doc_ids: Optional[List[str]] = None,  # filter to specific documents
) -> List[dict]:
    """
    Find top_k chunks most similar to query_embedding.
    Returns list of {text, metadata, score} sorted by score desc.
    score = 1 - cosine_distance (range 0-1, higher = more similar)
    """
    collection = _get_collection()

    # Build optional where-filter for scoped queries
    where = None
    if doc_ids:
        where = {"doc_id": {"$in": doc_ids}} if len(doc_ids) > 1 else {"doc_id": doc_ids[0]}

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(top_k, collection.count() or 1),
        where=where,
        include=["documents", "metadatas", "distances"],
    )

    chunks = []
    for doc, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        chunks.append({
            "text":     doc,
            "metadata": meta,
            "score":    round(1.0 - dist, 4),  # cosine distance → similarity
        })

    return chunks


async def delete_document(doc_id: str) -> int:
    """Delete all chunks belonging to doc_id. Returns count deleted."""
    collection = _get_collection()
    existing = collection.get(where={"doc_id": doc_id})
    if existing["ids"]:
        collection.delete(ids=existing["ids"])
        logger.info(f"Deleted {len(existing['ids'])} chunks for doc {doc_id}")
        return len(existing["ids"])
    return 0


async def get_all_documents() -> List[dict]:
    """
    Return one entry per unique doc_id (not per chunk).
    Used to populate the document list in the FE.
    """
    collection = _get_collection()
    if collection.count() == 0:
        return []

    # Fetch all, deduplicate by doc_id
    all_items = collection.get(include=["metadatas"])
    seen = {}
    for meta in all_items["metadatas"]:
        doc_id = meta["doc_id"]
        if doc_id not in seen:
            seen[doc_id] = {
                "doc_id":         doc_id,
                "filename":       meta["filename"],
                "file_type":      meta.get("file_type", "unknown"),
                "chunks_created": meta["total_chunks"],
                "uploaded_at":    meta.get("uploaded_at", ""),
            }
    return list(seen.values())


def get_collection_count() -> int:
    """Total number of chunks stored (for health check)."""
    try:
        return _get_collection().count()
    except Exception:
        return 0
