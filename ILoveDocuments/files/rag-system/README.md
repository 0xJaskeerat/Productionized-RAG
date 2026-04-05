# RAG System — Production Ready

Retrieval-Augmented Generation system. Upload documents, ask questions, get answers grounded strictly in your documents.

## Stack

| Layer | Technology | Why |
|---|---|---|
| Backend | FastAPI + Python 3.12 | Async, fast, auto-docs |
| Vector Store | ChromaDB | Embedded, persistent, cosine similarity |
| Embeddings | OpenAI text-embedding-3-small / nomic-embed-text | Best quality/cost ratio |
| LLM | GPT-4o-mini / Llama 3.2 (Ollama) | Configurable, streaming |
| Frontend | React 18 + Vite + Zustand | Lightweight, no Redux boilerplate |
| Reverse Proxy | Nginx | SSE-compatible, static file serving |
| Containers | Docker + Docker Compose | Reproducible everywhere |

## Architecture

```
Backend: Clean Architecture / Layered
  routers/       ← HTTP layer (requests, validation, responses)
  services/      ← Business logic (chunker, embeddings, vectorstore, llm)
  rag_pipeline   ← Orchestrator (wires all services, called by routers)
  models/        ← Pydantic schemas (contracts)
  middleware/    ← Cross-cutting concerns (logging)

Frontend: Feature-based components
  store/         ← Zustand global state (documents, messages)
  services/      ← API layer (all fetch() calls live here)
  hooks/         ← Reusable logic (upload, auto-scroll)
  components/    ← Pure UI (DocumentPanel, ChatWindow, Message, SourceCard)
```

## Quick Start

### Option A — OpenAI (Recommended)

```bash
# 1. Clone and configure
cp .env.example .env
# Edit .env: set OPENAI_API_KEY, LLM_PROVIDER=openai

# 2. Remove the ollama service from docker-compose.yml
#    (or leave it, it just won't be used)

# 3. Start
docker-compose up --build

# 4. Open http://localhost:3000
```

### Option B — Ollama (Free, Local)

```bash
# 1. Configure
cp .env.example .env
# Edit .env: set LLM_PROVIDER=ollama

# 2. Start everything
docker-compose up --build -d

# 3. Pull models into the Ollama container (one-time, ~2GB download)
docker exec rag-ollama ollama pull nomic-embed-text
docker exec rag-ollama ollama pull llama3.2

# 4. Open http://localhost:3000
```

## API Reference

After starting, Swagger UI is at: http://localhost:8000/docs

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/documents/upload | Upload + index a document |
| GET | /api/documents/list | List all indexed documents |
| DELETE | /api/documents/{doc_id} | Remove a document |
| POST | /api/query | Stream a RAG query (SSE) |
| GET | /health | Health check |

### Query SSE format

```
POST /api/query
{"query": "What is the refund policy?", "doc_ids": null}

Stream response:
data: {"sources": [{"filename": "...", "score": 0.87, ...}]}
data: {"token": "Based"}
data: {"token": " on"}
data: {"token": " the"}
...
data: [DONE]
```

## Tuning Guide

| Parameter | Default | When to change |
|---|---|---|
| CHUNK_SIZE | 512 tokens | Decrease for precise retrieval, increase for more context |
| CHUNK_OVERLAP | 64 tokens | Increase if answers seem to cut off mid-context |
| TOP_K | 5 | Increase for broad questions, decrease to reduce noise |
| MIN_SCORE_THRESHOLD | 0.45 | Increase if you're getting irrelevant chunks |

## Upgrading to Production Scale

- **Vector store**: Migrate from ChromaDB → Pinecone / pgvector when > 1M chunks
- **Auth**: Add JWT middleware before exposing publicly
- **Rate limiting**: Add slowapi to prevent abuse
- **Monitoring**: Add Prometheus metrics + Grafana dashboard
- **Eval**: Add RAGAS pipeline (Job 2) to measure quality continuously
