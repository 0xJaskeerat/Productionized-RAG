/**
 * api.js — All backend API calls live here.
 *
 * Architecture: Service Layer pattern.
 * Components never call fetch() directly. They call these functions.
 * Why? One place to change the base URL, add auth headers, handle errors globally.
 */

const BASE_URL = "/api"; // Vite proxy (dev) or nginx (Docker) handles routing to backend

// ── Documents ─────────────────────────────────────────────────────────────────

/**
 * Upload a file and index it.
 * @param {File} file
 * @returns {Promise<{doc_id, filename, chunks_created, message}>}
 */
export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/documents/upload`, {
    method: "POST",
    body: formData,
    // Don't set Content-Type — browser sets multipart/form-data + boundary automatically
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Upload failed");
  }

  return res.json();
}

/**
 * Fetch all indexed documents.
 * @returns {Promise<Document[]>}
 */
export async function fetchDocuments() {
  const res = await fetch(`${BASE_URL}/documents/list`);
  if (!res.ok) throw new Error("Failed to fetch documents");
  return res.json();
}

/**
 * Delete a document and all its chunks.
 * @param {string} docId
 */
export async function deleteDocument(docId) {
  const res = await fetch(`${BASE_URL}/documents/${docId}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Delete failed");
  }
  return res.json();
}

// ── Query (SSE streaming) ─────────────────────────────────────────────────────

/**
 * Stream a RAG query response via Server-Sent Events.
 *
 * @param {string} query - User's question
 * @param {string[]|null} docIds - Optional: scope to specific documents
 * @param {function} onSources - Called once with retrieved source chunks
 * @param {function} onToken   - Called for every streamed token
 * @param {function} onError   - Called if the stream errors
 * @param {function} onDone    - Called when stream completes
 */
export async function streamQuery({ query, docIds = null, onSources, onToken, onError, onDone }) {
  const res = await fetch(`${BASE_URL}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, doc_ids: docIds }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    onError(err.detail || "Query failed");
    return;
  }

  // Read SSE stream line by line
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop(); // last line may be incomplete — keep for next iteration

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;

      const raw = line.slice(6).trim();
      if (raw === "[DONE]") {
        onDone();
        return;
      }

      try {
        const data = JSON.parse(raw);
        if (data.sources) onSources(data.sources);
        else if (data.token) onToken(data.token);
        else if (data.error) onError(data.error);
      } catch {
        // Malformed JSON line — skip it
      }
    }
  }

  onDone();
}

// ── Health ────────────────────────────────────────────────────────────────────

export async function fetchHealth() {
  const res = await fetch("/health");
  if (!res.ok) throw new Error("Backend unreachable");
  return res.json();
}
