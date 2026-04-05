# RAG System — Full Architecture Reference

---

## Folder & File Structure (38 files)

```
rag-system/
│
├── .env.example                          ← Copy to .env, fill secrets
├── .gitignore
├── README.md
├── docker-compose.yml                    ← Orchestrates all 3 containers
│
├── backend/
│   ├── Dockerfile                        ← Multi-stage build (builder + runtime)
│   ├── requirements.txt
│   └── app/
│       ├── __init__.py
│       ├── main.py                       ← FastAPI app, middleware, router mounting
│       ├── config.py                     ← All settings from .env (pydantic-settings)
│       │
│       ├── middleware/
│       │   └── logging_middleware.py     ← Request/response logger (method, path, ms)
│       │
│       ├── models/
│       │   └── schemas.py                ← Pydantic contracts (request/response shapes)
│       │
│       ├── routers/                      ← HTTP layer only. No business logic here.
│       │   ├── health.py                 ← GET /health
│       │   ├── ingest.py                 ← POST /api/documents/upload
│       │   │                               GET  /api/documents/list
│       │   │                               DELETE /api/documents/{id}
│       │   └── query.py                  ← POST /api/query  (SSE stream)
│       │
│       └── services/                     ← Business logic. Each does ONE thing.
│           ├── chunker.py                ← Text extraction (PDF/DOCX/TXT) + chunking
│           ├── embeddings.py             ← OpenAI or Ollama embedding calls
│           ├── vectorstore.py            ← ChromaDB: upsert, search, delete
│           ├── llm.py                    ← Streaming LLM call + prompt builder
│           └── rag_pipeline.py           ← ORCHESTRATOR: wires all services together
│                                            ingest_document() + query_documents()
│
└── frontend/
    ├── Dockerfile                        ← Node build → nginx serve
    ├── nginx.conf                        ← Proxy /api/* to backend, serve React
    ├── package.json
    ├── vite.config.js                    ← Dev proxy, build config
    ├── index.html
    └── src/
        ├── main.jsx                      ← React entry point
        ├── App.jsx                       ← Root layout (sidebar + chat)
        │
        ├── components/                   ← Pure UI, no fetch calls
        │   ├── DocumentPanel.jsx         ← Left sidebar: upload dropzone + doc list
        │   ├── ChatWindow.jsx            ← Chat area: message list + input bar
        │   ├── Message.jsx               ← Single message bubble + citations header
        │   └── SourceCard.jsx            ← Expandable citation card with score
        │
        ├── hooks/                        ← Reusable stateful logic
        │   ├── useDocumentUpload.js      ← Upload state: loading, error, success
        │   └── useAutoScroll.js          ← Auto-scroll that respects user scroll-up
        │
        ├── services/
        │   └── api.js                    ← ALL fetch() calls. Components never call fetch directly.
        │                                    uploadDocument(), fetchDocuments(), streamQuery(), ...
        │
        └── store/
            └── useStore.js               ← Zustand global store
                                             Slices: documents | messages | ui
```

---

## Backend Architecture: Clean / Layered Architecture

```
HTTP Request
     │
     ▼
┌─────────────────────────────────────────┐
│  ROUTER LAYER  (routers/)               │  ← Handles HTTP: validation, errors, response codes
│  ingest.py / query.py / health.py       │    Never contains business logic
└────────────────────┬────────────────────┘
                     │ calls
                     ▼
┌─────────────────────────────────────────┐
│  ORCHESTRATION LAYER  (rag_pipeline.py) │  ← Single entry point for all RAG logic
│  ingest_document() / query_documents()  │    Wires services together in correct order
└──────┬──────────┬──────────┬────────────┘
       │          │          │
       ▼          ▼          ▼
┌──────────┐ ┌─────────┐ ┌──────────────┐
│ chunker  │ │embeddings│ │ vectorstore  │  ← DOMAIN SERVICES
│ .py      │ │.py       │ │ .py          │    Each does one job.
└──────────┘ └─────────┘ └──────────────┘    Services never import each other.
                               │
                               ▼
                        ┌─────────────┐
                        │   llm.py    │  ← LLM streaming
                        └─────────────┘

RULE: Each layer only calls the layer below it.
      Routers → Pipeline → Services → External APIs
      Services NEVER call other services directly.
```

### Why this architecture?
- **Routers** stay thin → easy to test, easy to read
- **rag_pipeline.py** is the single file to read to understand the whole flow
- **Services** are independently swappable (swap ChromaDB → Pinecone = edit vectorstore.py only)
- **config.py** is the single source of truth for all settings

---

## Frontend Architecture: Feature-based + Service Layer + Global Store

```
┌─────────────────────────────────────────────────────────┐
│  COMPONENTS (presentational)                             │
│  DocumentPanel  ChatWindow  Message  SourceCard          │
│  - Read from store                                       │
│  - Call store actions                                    │
│  - NEVER call fetch() directly                           │
└──────────────────────┬──────────────────────────────────┘
                       │ calls actions from
                       ▼
┌─────────────────────────────────────────────────────────┐
│  ZUSTAND STORE  (store/useStore.js)                      │
│  documents slice | messages slice | ui slice             │
│  - Holds all shared state                                │
│  - Calls API service functions                           │
│  - Updates state based on results                        │
└──────────────────────┬──────────────────────────────────┘
                       │ calls
                       ▼
┌─────────────────────────────────────────────────────────┐
│  API SERVICE  (services/api.js)                          │
│  uploadDocument()  fetchDocuments()  streamQuery()       │
│  - All fetch() calls in ONE place                        │
│  - Handles SSE stream parsing                            │
│  - Throws errors with clean messages                     │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP/SSE
                       ▼
              FastAPI Backend
```

### Why this architecture?
- **Service layer** → changing the API URL/auth = edit one file
- **Zustand store** → no prop drilling, any component accesses any state
- **Hooks** → upload logic and scroll logic reusable across multiple components
- **Components stay dumb** → easy to test, easy to restyle

---

## Data Flow: Ingestion Pipeline

```
User uploads biology.pdf
         │
         ▼
POST /api/documents/upload   [ingest.py router]
         │ validates: extension, size
         ▼
ingest_document()             [rag_pipeline.py orchestrator]
         │
         ├─► extract_text(file_bytes, "biology.pdf")     [chunker.py]
         │       └─► pypdf.PdfReader → raw text (with [Page N] tags)
         │
         ├─► chunk_document(text, doc_id, filename)      [chunker.py]
         │       └─► RecursiveCharacterTextSplitter (token-based)
         │           → 47 chunks, each 512 tokens with 64 token overlap
         │
         ├─► get_embeddings([chunk1_text, chunk2_text, ...]) [embeddings.py]
         │       └─► OpenAI: batch API call → 47 × [float × 1536]
         │           OR Ollama: 47 sequential calls → 47 × [float × 768]
         │
         └─► upsert_chunks(chunks, embeddings)           [vectorstore.py]
                 └─► ChromaDB.collection.upsert(
                         ids=["docid_chunk_0", "docid_chunk_1", ...],
                         embeddings=[[...], [...]],
                         documents=["text...", "text..."],
                         metadatas=[{doc_id, filename, chunk_index, ...}]
                     )

Result: 47 vectors + text + metadata stored in ChromaDB on disk.
```

---

## Data Flow: Query Pipeline (SSE Stream)

```
User types: "What is photosynthesis?"
         │
         ▼
POST /api/query  {"query": "What is photosynthesis?"}    [query.py router]
         │
         ▼
query_documents(query, doc_ids=None)                     [rag_pipeline.py]
         │
         ├─► get_embeddings(["What is photosynthesis?"]) [embeddings.py]
         │       └─► [0.11, -0.43, 0.80, ...]  ← query vector (1 call)
         │
         ├─► similarity_search(query_vector, top_k=20)   [vectorstore.py]
         │       └─► ChromaDB cosine search → 20 candidates sorted by score
         │
         ├─► filter by MIN_SCORE_THRESHOLD (0.45)
         │       └─► drops 8 low-score chunks → 12 remain
         │
         ├─► take top 5 (TOP_K)
         │
         ├─► yield {"sources": [{filename, chunk_index, score, preview}, ...]}
         │       └─► FE immediately renders citation cards ← happens BEFORE LLM
         │
         └─► stream_answer(query, top_5_chunks)          [llm.py]
                 ├─► build_rag_prompt(query, chunks)
                 │       "DOCUMENT CONTEXT:\n[Source 1 | biology.pdf | chunk 3]...\n
                 │        QUESTION: What is photosynthesis?\n
                 │        Answer based strictly on the context above:"
                 │
                 └─► OpenAI streaming / Ollama streaming
                         yield {"token": "Photo"}
                         yield {"token": "synthesis"}
                         yield {"token": " is"}
                         ...  (FE appends each token to message bubble)
         │
         ▼
yield "data: [DONE]"     ← SSE terminal event

Total latency breakdown:
  ~100ms  embedding the query
  ~50ms   ChromaDB similarity search
  ~0ms    filtering + sorting
  ~800ms  first LLM token (TTFT - time to first token)
  ~2-8s   full response streaming completes
```

---

## Docker Architecture

```
docker-compose.yml
       │
       ├── rag-backend   (FastAPI, port 8000 internal)
       │     image: ./backend/Dockerfile (multi-stage)
       │     volumes: chroma_data:/data/chroma
       │     env_file: .env
       │
       ├── rag-frontend  (Nginx, port 3000 → 80 internal)
       │     image: ./frontend/Dockerfile (node build → nginx serve)
       │     nginx.conf:
       │       /         → serve React SPA (index.html)
       │       /api/*    → proxy to backend:8000
       │       /health   → proxy to backend:8000/health
       │
       └── rag-ollama    (Ollama, port 11434, optional)
             image: ollama/ollama:latest
             volumes: ollama_data:/root/.ollama

All services on network: rag-network (bridge)
Service discovery by name: backend:8000, ollama:11434
```

---

## How to Run

```bash
# 1. Configure
cp .env.example .env
# nano .env  → set OPENAI_API_KEY (or set LLM_PROVIDER=ollama)

# 2. Start
docker-compose up --build

# 3. If using Ollama, pull models (one-time, ~2GB)
docker exec rag-ollama ollama pull nomic-embed-text
docker exec rag-ollama ollama pull llama3.2

# 4. Open
#   App:     http://localhost:3000
#   API docs: http://localhost:8000/docs
#   Health:   http://localhost:8000/health

# 5. Stop
docker-compose down

# Stop and DELETE all data (vectors, models)
docker-compose down -v
```

---

## Environment Variables Quick Reference

| Variable | Default | Description |
|---|---|---|
| LLM_PROVIDER | openai | `openai` or `ollama` |
| OPENAI_API_KEY | — | Required if openai |
| CHUNK_SIZE | 512 | Tokens per chunk. Decrease for precise retrieval. |
| CHUNK_OVERLAP | 64 | Token overlap. Increase to reduce boundary cuts. |
| TOP_K | 5 | Chunks sent to LLM. More = more context, slower. |
| MIN_SCORE_THRESHOLD | 0.45 | Drop chunks below this similarity. Increase if noisy. |
| RERANK_CANDIDATES | 20 | Candidates retrieved before TOP_K filtering. |
