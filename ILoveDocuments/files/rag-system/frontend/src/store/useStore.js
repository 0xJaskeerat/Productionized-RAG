/**
 * useStore.js — Global state management with Zustand.
 *
 * Architecture: Single store, sliced by domain (documents, messages, ui).
 * Why Zustand over Redux? 80% less boilerplate for the same result.
 * Why global store? Documents and messages are needed by multiple components.
 */

import { create } from "zustand";
import { uploadDocument, fetchDocuments, deleteDocument, streamQuery } from "../services/api.js";

const useStore = create((set, get) => ({

  // ── Documents slice ─────────────────────────────────────────────────────────
  documents: [],
  docsLoading: false,
  docsError: null,

  loadDocuments: async () => {
    set({ docsLoading: true, docsError: null });
    try {
      const docs = await fetchDocuments();
      set({ documents: docs });
    } catch (e) {
      set({ docsError: e.message });
    } finally {
      set({ docsLoading: false });
    }
  },

  uploadDoc: async (file) => {
    // Returns result so component can show success toast
    const result = await uploadDocument(file);
    // Append to local state — no need to refetch the whole list
    set((s) => ({
      documents: [...s.documents, {
        doc_id: result.doc_id,
        filename: result.filename,
        file_type: file.name.split(".").pop(),
        chunks_created: result.chunks_created,
        uploaded_at: new Date().toISOString(),
      }],
    }));
    return result;
  },

  removeDoc: async (docId) => {
    await deleteDocument(docId);
    set((s) => ({
      documents: s.documents.filter((d) => d.doc_id !== docId),
      // Also remove messages that referenced this doc (optional UX choice)
    }));
  },

  // ── Messages slice ──────────────────────────────────────────────────────────
  messages: [
    {
      id: "welcome",
      role: "assistant",
      content: "Upload documents to your knowledge base using the panel on the left, then ask me anything about them. I'll retrieve the most relevant sections and answer strictly from your documents.",
      sources: null,
      streaming: false,
    },
  ],

  sendQuery: async (query) => {
    const userMsgId = `user-${Date.now()}`;
    const aiMsgId = `ai-${Date.now()}`;

    // Add user message immediately
    set((s) => ({
      messages: [
        ...s.messages,
        { id: userMsgId, role: "user", content: query, sources: null, streaming: false },
        { id: aiMsgId, role: "assistant", content: "", sources: null, streaming: true },
      ],
    }));

    await streamQuery({
      query,
      docIds: null, // query across all documents

      onSources: (sources) => {
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === aiMsgId ? { ...m, sources } : m
          ),
        }));
      },

      onToken: (token) => {
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === aiMsgId ? { ...m, content: m.content + token } : m
          ),
        }));
      },

      onError: (error) => {
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === aiMsgId
              ? { ...m, content: `⚠ ${error}`, streaming: false }
              : m
          ),
        }));
      },

      onDone: () => {
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === aiMsgId ? { ...m, streaming: false } : m
          ),
        }));
      },
    });
  },

  clearMessages: () =>
    set({ messages: [{ id: "welcome", role: "assistant", content: "Chat cleared. Ask me anything about your documents.", sources: null, streaming: false }] }),

  // ── UI slice ────────────────────────────────────────────────────────────────
  isQuerying: false,
  setQuerying: (v) => set({ isQuerying: v }),

  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));

export default useStore;
