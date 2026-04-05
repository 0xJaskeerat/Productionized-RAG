/**
 * DocumentPanel.jsx — Left sidebar.
 * Document upload + indexed document list.
 * Uses useDocumentUpload hook for upload logic.
 */
import { useEffect, useRef, useState } from "react";
import useStore from "../store/useStore.js";
import { useDocumentUpload } from "../hooks/useDocumentUpload.js";

const FILE_ICONS = { pdf: "⬡", docx: "⬡", txt: "⬡", md: "⬡" };
const FILE_COLORS = { pdf: "#f87171", docx: "#60a5fa", txt: "#a3e635", md: "#c084fc" };

function DocItem({ doc, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const ext = doc.filename.split(".").pop().toLowerCase();

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirm(`Remove "${doc.filename}" from the knowledge base?`)) return;
    setDeleting(true);
    try { await onDelete(doc.doc_id); }
    finally { setDeleting(false); }
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "9px 10px",
      borderRadius: 8,
      background: "#0d1117",
      border: "1px solid #1c2128",
      opacity: deleting ? 0.5 : 1,
      transition: "opacity 0.2s",
    }}>
      {/* File type color indicator */}
      <div style={{
        width: 6,
        height: 28,
        borderRadius: 3,
        background: FILE_COLORS[ext] || "#484f58",
        flexShrink: 0,
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12,
          color: "#c9d1d9",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {doc.filename}
        </div>
        <div style={{ fontSize: 10, color: "#484f58", marginTop: 1 }}>
          {doc.chunks_created} chunks · {ext.toUpperCase()}
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        style={{
          background: "none",
          border: "none",
          color: "#484f58",
          cursor: "pointer",
          fontSize: 14,
          padding: "2px 4px",
          borderRadius: 4,
          flexShrink: 0,
          lineHeight: 1,
        }}
        title="Remove document"
      >
        ✕
      </button>
    </div>
  );
}


export default function DocumentPanel() {
  const documents = useStore((s) => s.documents);
  const loadDocuments = useStore((s) => s.loadDocuments);
  const removeDoc = useStore((s) => s.removeDoc);
  const docsLoading = useStore((s) => s.docsLoading);

  const { upload, uploading, uploadError, lastUploaded, setUploadError } = useDocumentUpload();
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  // Load existing documents on mount
  useEffect(() => { loadDocuments(); }, []);

  const handleFileChange = (e) => { upload(e.target.files[0]); };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    upload(e.dataTransfer.files[0]);
  };

  return (
    <div style={{
      width: 280,
      background: "#010409",
      borderRight: "1px solid #21262d",
      display: "flex",
      flexDirection: "column",
      height: "100%",
      flexShrink: 0,
    }}>

      {/* ── Logo / Branding ──────────────────────────────────────────────── */}
      <div style={{
        padding: "20px 20px 16px",
        borderBottom: "1px solid #21262d",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <div style={{
            width: 32,
            height: 32,
            background: "linear-gradient(135deg, #1d4ed8, #7c3aed)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 15,
          }}>
            R
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#e6edf3", letterSpacing: "-0.02em" }}>
              RAG System
            </div>
            <div style={{ fontSize: 10, color: "#484f58" }}>
              Retrieval · Augmented · Generation
            </div>
          </div>
        </div>
      </div>

      {/* ── Upload Area ──────────────────────────────────────────────────── */}
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{
          fontSize: 10,
          color: "#484f58",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}>
          Knowledge Base
        </div>

        {/* Drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            border: `1px dashed ${dragOver ? "#2563eb" : "#21262d"}`,
            borderRadius: 10,
            padding: "20px 16px",
            textAlign: "center",
            cursor: uploading ? "not-allowed" : "pointer",
            background: dragOver ? "#0d1b3e" : "transparent",
            transition: "all 0.2s",
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />

          {uploading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 22,
                height: 22,
                border: "2px solid #1c2128",
                borderTop: "2px solid #2563eb",
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
              }} />
              <span style={{ fontSize: 11, color: "#484f58" }}>Indexing…</span>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 24, marginBottom: 6 }}>↑</div>
              <div style={{ fontSize: 12, color: "#8b949e", marginBottom: 4 }}>
                Drop file or click to upload
              </div>
              <div style={{ fontSize: 10, color: "#484f58" }}>
                PDF · DOCX · TXT · MD · max 20MB
              </div>
            </>
          )}
        </div>

        {/* Upload error */}
        {uploadError && (
          <div style={{
            marginTop: 8,
            padding: "8px 10px",
            background: "#2d0f0f",
            border: "1px solid #7f1d1d",
            borderRadius: 6,
            fontSize: 11,
            color: "#fca5a5",
            display: "flex",
            justifyContent: "space-between",
          }}>
            <span>{uploadError}</span>
            <span style={{ cursor: "pointer", color: "#484f58" }} onClick={() => setUploadError(null)}>✕</span>
          </div>
        )}

        {/* Success toast */}
        {lastUploaded && !uploading && (
          <div style={{
            marginTop: 8,
            padding: "8px 10px",
            background: "#0d2b1e",
            border: "1px solid #14532d",
            borderRadius: 6,
            fontSize: 11,
            color: "#86efac",
          }}>
            ✓ {lastUploaded.filename} — {lastUploaded.chunks_created} chunks indexed
          </div>
        )}
      </div>

      {/* ── Document List ────────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "12px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}>
        {docsLoading ? (
          <div style={{ fontSize: 11, color: "#484f58", textAlign: "center", padding: 20 }}>
            Loading documents…
          </div>
        ) : documents.length === 0 ? (
          <div style={{
            fontSize: 11,
            color: "#30363d",
            textAlign: "center",
            padding: "20px 10px",
            lineHeight: 1.7,
          }}>
            No documents yet.<br />Upload a file to start querying.
          </div>
        ) : (
          documents.map((doc) => (
            <DocItem key={doc.doc_id} doc={doc} onDelete={removeDoc} />
          ))
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div style={{
        padding: "12px 16px",
        borderTop: "1px solid #1c2128",
        fontSize: 10,
        color: "#30363d",
        lineHeight: 1.6,
      }}>
        {documents.length > 0 && `${documents.length} doc${documents.length > 1 ? "s" : ""} indexed · `}
        ChromaDB vector store
      </div>
    </div>
  );
}
