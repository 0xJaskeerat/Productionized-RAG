"""
schemas.py — All Pydantic models (request/response shapes).
These are the contracts between FE and BE.
FastAPI auto-generates OpenAPI docs from these.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ── Ingest / Document ─────────────────────────────────────────────────────────

class DocumentMeta(BaseModel):
    """Stored in ChromaDB metadata and returned to FE"""
    doc_id: str
    filename: str
    file_type: str
    chunks_created: int
    uploaded_at: str


class UploadResponse(BaseModel):
    success: bool
    doc_id: str
    filename: str
    chunks_created: int
    message: str


class DocumentListItem(BaseModel):
    doc_id: str
    filename: str
    file_type: str
    chunks_created: int
    uploaded_at: str


class DeleteResponse(BaseModel):
    success: bool
    doc_id: str
    message: str


# ── Query ─────────────────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    doc_ids: Optional[list[str]] = None   # scope query to specific docs; None = all docs


class SourceChunk(BaseModel):
    """A retrieved chunk shown to the user as a citation"""
    filename: str
    doc_id: str
    chunk_index: int
    score: float = Field(ge=0.0, le=1.0)
    preview: str                           # first 250 chars of chunk text


# ── Health ────────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    llm_provider: str
    vector_store: str
    documents_indexed: int
