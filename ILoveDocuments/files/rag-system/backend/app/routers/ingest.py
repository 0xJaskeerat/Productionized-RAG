"""
ingest.py — Document upload and management routes.

Architecture: Thin router. Business logic lives in rag_pipeline.py.
Routers handle: HTTP concerns, validation, error responses.
"""

import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, Path

from app.services.rag_pipeline import ingest_document, list_documents, remove_document
from app.models.schemas import UploadResponse, DeleteResponse
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/documents", tags=["Documents"])


@router.post("/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """
    Upload and index a document.
    Extracts text → chunks → embeds → stores in ChromaDB.
    """
    # Validate extension
    ext = file.filename.lower().rsplit(".", 1)[-1] if "." in file.filename else ""
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '.{ext}' not supported. Allowed: {settings.ALLOWED_EXTENSIONS}"
        )

    # Read and validate size
    file_bytes = await file.read()
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max size: {settings.MAX_FILE_SIZE_MB}MB"
        )

    try:
        result = await ingest_document(file_bytes, file.filename)
        return UploadResponse(
            success=True,
            doc_id=result["doc_id"],
            filename=result["filename"],
            chunks_created=result["chunks_created"],
            message=f"Successfully indexed {result['chunks_created']} chunks from '{file.filename}'"
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Ingest failed for {file.filename}: {e}")
        raise HTTPException(status_code=500, detail="Failed to process document. Check server logs.")


@router.get("/list")
async def list_all_documents():
    """Return all indexed documents (one entry per document, not per chunk)."""
    return await list_documents()


@router.delete("/{doc_id}", response_model=DeleteResponse)
async def delete_document(doc_id: str = Path(...)):
    """Remove a document and all its chunks from the vector store."""
    deleted_count = await remove_document(doc_id)
    if deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found")
    return DeleteResponse(
        success=True,
        doc_id=doc_id,
        message=f"Deleted {deleted_count} chunks"
    )
