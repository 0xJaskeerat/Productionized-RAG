/**
 * ChatWindow.jsx — Main chat area.
 * Renders message list + input bar.
 * Delegates all state to the Zustand store.
 */
import { useState, useRef } from "react";
import useStore from "../store/useStore.js";
import { useAutoScroll } from "../hooks/useAutoScroll.js";
import Message from "./Message.jsx";

export default function ChatWindow() {
  const [input, setInput] = useState("");
  const messages = useStore((s) => s.messages);
  const sendQuery = useStore((s) => s.sendQuery);
  const documents = useStore((s) => s.documents);
  const isQuerying = useStore((s) => s.isQuerying);
  const setQuerying = useStore((s) => s.setQuerying);
  const clearMessages = useStore((s) => s.clearMessages);

  const { containerRef, handleScroll } = useAutoScroll(messages);
  const inputRef = useRef();

  const isStreaming = messages.some((m) => m.streaming);
  const canQuery = documents.length > 0 && !isStreaming && input.trim().length > 0;

  const handleSend = async () => {
    if (!canQuery) return;
    const query = input.trim();
    setInput("");
    setQuerying(true);
    try {
      await sendQuery(query);
    } finally {
      setQuerying(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: "#0d1117",
      overflow: "hidden",
    }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{
        padding: "14px 24px",
        borderBottom: "1px solid #21262d",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#0d1117",
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#e6edf3", letterSpacing: "-0.01em" }}>
            Document Q&A
          </div>
          <div style={{ fontSize: 11, color: "#484f58", marginTop: 2 }}>
            {documents.length === 0
              ? "No documents — upload files to begin"
              : `${documents.length} document${documents.length > 1 ? "s" : ""} in knowledge base · answers cite sources`}
          </div>
        </div>
        <button
          onClick={clearMessages}
          style={{
            background: "none",
            border: "1px solid #21262d",
            borderRadius: 6,
            color: "#484f58",
            fontSize: 11,
            padding: "4px 10px",
            cursor: "pointer",
          }}
        >
          Clear
        </button>
      </div>

      {/* ── Messages ──────────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          scrollbarWidth: "thin",
          scrollbarColor: "#21262d transparent",
        }}
      >
        {messages.map((msg) => (
          <Message key={msg.id} msg={msg} />
        ))}
      </div>

      {/* ── Input Bar ─────────────────────────────────────────────────────── */}
      <div style={{
        padding: "16px 24px",
        borderTop: "1px solid #21262d",
        background: "#0d1117",
        flexShrink: 0,
      }}>
        <div style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-end",
          background: "#161b22",
          border: `1px solid ${documents.length === 0 ? "#1c2128" : "#30363d"}`,
          borderRadius: 12,
          padding: "10px 14px",
          transition: "border-color 0.2s",
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={documents.length === 0 || isStreaming}
            placeholder={
              documents.length === 0
                ? "Upload documents first…"
                : isStreaming
                  ? "Generating response…"
                  : "Ask anything about your documents… (Enter to send)"
            }
            rows={1}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: documents.length === 0 ? "#484f58" : "#c9d1d9",
              fontSize: 13.5,
              fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
              lineHeight: 1.5,
              resize: "none",
              maxHeight: 120,
              overflowY: "auto",
            }}
            onInput={(e) => {
              // Auto-grow textarea
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={handleSend}
            disabled={!canQuery}
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: canQuery ? "#2563eb" : "#1c2128",
              border: "none",
              cursor: canQuery ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "background 0.2s",
            }}
          >
            {isStreaming
              ? <div style={{ width: 14, height: 14, border: "2px solid #484f58", borderTop: "2px solid #3b82f6", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
              : <span style={{ color: canQuery ? "#fff" : "#484f58", fontSize: 15 }}>↑</span>
            }
          </button>
        </div>
        <div style={{ fontSize: 10, color: "#30363d", marginTop: 6, textAlign: "center" }}>
          Answers are grounded in your documents only · Enter to send · Shift+Enter for newline
        </div>
      </div>

    </div>
  );
}
