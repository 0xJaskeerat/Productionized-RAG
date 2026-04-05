"""
query.py — RAG query route.

Returns Server-Sent Events (SSE) stream.
Why SSE and not WebSocket?
- SSE is simpler (HTTP/1.1, no upgrade handshake)
- One-directional (server → client) which is all we need here
- Works through most proxies and load balancers
"""

import json
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.services.rag_pipeline import query_documents
from app.models.schemas import QueryRequest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Query"])


@router.post("/query")
async def query(request: QueryRequest):
    """
    SSE stream that yields:
      data: {"sources": [...]}      ← first event, citations
      data: {"token": "..."}        ← many of these, streamed tokens
      data: {"error": "..."}        ← only on failure
      data: [DONE]                  ← terminal event
    """
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    async def event_stream():
        try:
            async for chunk in query_documents(request.query, request.doc_ids):
                yield f"data: {json.dumps(chunk)}\n\n"
        except Exception as e:
            logger.error(f"Query stream error: {e}")
            yield f"data: {json.dumps({'error': 'Stream interrupted. Please retry.'})}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",   # tells nginx NOT to buffer SSE
        },
    )
