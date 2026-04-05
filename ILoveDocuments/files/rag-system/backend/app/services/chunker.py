"""
chunker.py — Text extraction + chunking service.

CRITICAL: This is where most RAG projects fail silently.
Bad chunking = wrong retrieval = wrong answers (stated confidently).

Strategy: RecursiveCharacterTextSplitter with TOKEN-based measurement.
Why tokens not characters? LLMs think in tokens. Character count lies to you.
"""

import io
import logging
from typing import List

import tiktoken
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# cl100k_base = tokenizer for GPT-4 and text-embedding-3-small
# Use consistently regardless of which LLM provider you chose
_tokenizer = tiktoken.get_encoding("cl100k_base")


def _count_tokens(text: str) -> int:
    """Measure text length in tokens — used as length_function for splitter."""
    return len(_tokenizer.encode(text))


def _get_splitter() -> RecursiveCharacterTextSplitter:
    """
    Tries split points in priority order:
    double newlines (paragraphs) → single newlines → sentences → words → chars
    Preserves semantic units better than dumb fixed-size cuts.
    """
    return RecursiveCharacterTextSplitter(
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP,
        length_function=_count_tokens,
        separators=["\n\n", "\n", ". ", "! ", "? ", ", ", " ", ""],
    )


def extract_text(file_bytes: bytes, filename: str) -> str:
    """Route to correct extractor based on file extension."""
    ext = filename.lower().rsplit(".", 1)[-1]

    if ext == "pdf":
        import pypdf
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        pages = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text and text.strip():
                # Tag each page — helps LLM cite page numbers
                pages.append(f"[Page {i+1}]\n{text.strip()}")
        raw = "\n\n".join(pages)

    elif ext == "docx":
        import docx
        doc = docx.Document(io.BytesIO(file_bytes))
        raw = "\n\n".join(p.text.strip() for p in doc.paragraphs if p.text.strip())

    elif ext in ("txt", "md"):
        raw = file_bytes.decode("utf-8", errors="replace").strip()

    else:
        raise ValueError(f"Unsupported file type: .{ext}")

    if not raw or len(raw.strip()) < 50:
        raise ValueError(
            f"Could not extract meaningful text from '{filename}'. "
            "Scanned PDFs need OCR preprocessing (pytesseract)."
        )

    logger.info(f"Extracted {_count_tokens(raw)} tokens from '{filename}'")
    return raw


def chunk_document(text: str, doc_id: str, filename: str) -> List[dict]:
    """
    Split document text into overlapping token-bounded chunks with metadata.

    Returns:
        List of {"text": str, "metadata": dict}
        text     → gets embedded and stored in ChromaDB
        metadata → returned as citations, shown to user
    """
    splitter = _get_splitter()
    raw_chunks = splitter.split_text(text)

    # Drop empty or near-empty chunks (can appear at document edges)
    raw_chunks = [c for c in raw_chunks if c.strip() and _count_tokens(c) > 10]

    chunks = [
        {
            "text": chunk,
            "metadata": {
                "doc_id":       doc_id,
                "filename":     filename,
                "chunk_index":  idx,
                "total_chunks": len(raw_chunks),
                "token_count":  _count_tokens(chunk),
                "preview":      chunk[:250].replace("\n", " "),
            }
        }
        for idx, chunk in enumerate(raw_chunks)
    ]

    logger.info(f"Created {len(chunks)} chunks from '{filename}'")
    return chunks
