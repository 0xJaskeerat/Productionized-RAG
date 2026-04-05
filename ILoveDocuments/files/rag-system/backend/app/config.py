"""
config.py — Centralized configuration using pydantic-settings.
All values come from environment variables / .env file.
NEVER hardcode secrets. This is the single source of truth for settings.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Literal


class Settings(BaseSettings):
    # ── App ──────────────────────────────────────────────────────────────────
    APP_NAME: str = "RAG System"
    APP_ENV: Literal["development", "production"] = "development"
    LOG_LEVEL: str = "INFO"

    # ── LLM Provider ─────────────────────────────────────────────────────────
    # "openai" uses OpenAI API (costs money, best quality)
    # "ollama" uses local Ollama server (free, needs GPU ideally)
    LLM_PROVIDER: Literal["openai", "ollama"] = "openai"

    # ── OpenAI ────────────────────────────────────────────────────────────────
    OPENAI_API_KEY: str = ""
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"   # 1536 dims, cheap
    OPENAI_CHAT_MODEL: str = "gpt-4o-mini"                   # fast + cheap for RAG

    # ── Ollama (local) ────────────────────────────────────────────────────────
    OLLAMA_BASE_URL: str = "http://ollama:11434"
    OLLAMA_EMBEDDING_MODEL: str = "nomic-embed-text"         # 768 dims
    OLLAMA_CHAT_MODEL: str = "llama3.2"

    # ── ChromaDB ──────────────────────────────────────────────────────────────
    CHROMA_PERSIST_DIR: str = "/data/chroma"                 # mounted Docker volume
    CHROMA_COLLECTION_NAME: str = "rag_documents"

    # ── Chunking ─────────────────────────────────────────────────────────────
    # Tune these based on your document types.
    # Smaller = precise retrieval but loses context
    # Larger = more context but diluted relevance
    CHUNK_SIZE: int = 512          # tokens per chunk
    CHUNK_OVERLAP: int = 64        # overlap between consecutive chunks

    # ── Retrieval ─────────────────────────────────────────────────────────────
    TOP_K: int = 5                  # how many chunks to retrieve
    RERANK_CANDIDATES: int = 20     # cast wide net before re-ranking
    MIN_SCORE_THRESHOLD: float = 0.45  # reject chunks below this similarity

    # ── File Upload ───────────────────────────────────────────────────────────
    MAX_FILE_SIZE_MB: int = 20
    ALLOWED_EXTENSIONS: list[str] = ["pdf", "docx", "txt", "md"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()  # singleton — one Settings instance for entire app lifetime
def get_settings() -> Settings:
    return Settings()
