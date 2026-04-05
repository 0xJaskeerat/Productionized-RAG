"""
llm.py — LLM interface with streaming support.

Streaming is non-negotiable for good UX.
Nobody wants to stare at a spinner for 10 seconds.

Temperature 0.1: factual, consistent. NOT 0.7 (that's for creative writing).
"""

import json
import logging
from typing import List, AsyncGenerator

import httpx
from openai import AsyncOpenAI

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ── System Prompt ─────────────────────────────────────────────────────────────
# This is fixed. It controls LLM behavior regardless of user query.
SYSTEM_PROMPT = """You are a precise, reliable document assistant.

Rules you must follow:
1. Answer ONLY from the provided document context below.
2. If the context does not contain the answer, say exactly: "The provided documents don't contain information about this."
3. Always reference which source (filename + chunk number) your answer came from.
4. Be concise. No filler. No padding.
5. If multiple sources support the answer, mention all of them.
6. Never guess, infer, or use outside knowledge."""


def build_rag_prompt(query: str, chunks: List[dict]) -> str:
    """
    Assemble the user message that goes to the LLM.
    Structure:
      [Context block with numbered sources]
      [User question]
      [Instruction to answer from context only]

    Numbered sources = easy for LLM to cite them in its answer.
    Most relevant chunk goes FIRST (LLM pays most attention to beginning).
    """
    context_parts = []
    for i, chunk in enumerate(chunks):
        meta = chunk["metadata"]
        context_parts.append(
            f"[Source {i+1} | {meta['filename']} | chunk {meta['chunk_index']+1}/{meta['total_chunks']} | relevance {chunk['score']:.0%}]\n"
            f"{chunk['text']}"
        )

    context_block = "\n\n---\n\n".join(context_parts)

    return (
        f"DOCUMENT CONTEXT:\n\n{context_block}\n\n"
        f"{'='*60}\n\n"
        f"QUESTION: {query}\n\n"
        f"Answer based strictly on the document context above:"
    )


async def stream_answer(query: str, chunks: List[dict]) -> AsyncGenerator[str, None]:
    """Stream LLM response token by token."""
    prompt = build_rag_prompt(query, chunks)

    if settings.LLM_PROVIDER == "openai":
        async for token in _openai_stream(prompt):
            yield token
    else:
        async for token in _ollama_stream(prompt):
            yield token


async def _openai_stream(prompt: str) -> AsyncGenerator[str, None]:
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async with client.chat.completions.stream(
        model=settings.OPENAI_CHAT_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": prompt},
        ],
        temperature=0.1,   # low = factual and consistent
        max_tokens=1500,
    ) as stream:
        async for text in stream.text_stream:
            yield text


async def _ollama_stream(prompt: str) -> AsyncGenerator[str, None]:
    async with httpx.AsyncClient(timeout=180.0) as client:
        async with client.stream(
            "POST",
            f"{settings.OLLAMA_BASE_URL}/api/chat",
            json={
                "model": settings.OLLAMA_CHAT_MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user",   "content": prompt},
                ],
                "stream": True,
                "options": {"temperature": 0.1},
            },
        ) as response:
            async for line in response.aiter_lines():
                if line:
                    data = json.loads(line)
                    if content := data.get("message", {}).get("content"):
                        yield content
