/**
 * SourceCard.jsx — Shows a retrieved chunk as a citation.
 * Expandable: click to see the full preview text.
 * Score color: green (high relevance) → yellow → red (low relevance)
 */
import { useState } from "react";

const scoreColor = (score) => {
  if (score >= 0.80) return "#4ade80";
  if (score >= 0.60) return "#fbbf24";
  return "#f87171";
};

const fileIcon = (filename) => {
  const ext = filename?.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "PDF";
  if (ext === "docx") return "DOC";
  return "TXT";
};

export default function SourceCard({ source, index }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      onClick={() => setExpanded((e) => !e)}
      style={{
        background: "#0d1117",
        border: `1px solid ${expanded ? "#30363d" : "#1c2128"}`,
        borderLeft: `3px solid ${scoreColor(source.score)}`,
        borderRadius: 6,
        padding: "8px 12px",
        cursor: "pointer",
        transition: "border-color 0.15s",
        userSelect: "none",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Source number badge */}
        <span style={{
          background: "#21262d",
          color: "#8b949e",
          fontSize: 10,
          fontWeight: 700,
          padding: "1px 6px",
          borderRadius: 3,
          fontFamily: "monospace",
          flexShrink: 0,
        }}>
          #{index + 1}
        </span>

        {/* File type badge */}
        <span style={{
          background: "#1f2937",
          color: "#60a5fa",
          fontSize: 9,
          fontWeight: 700,
          padding: "2px 5px",
          borderRadius: 3,
          letterSpacing: "0.05em",
          flexShrink: 0,
        }}>
          {fileIcon(source.filename)}
        </span>

        {/* Filename */}
        <span style={{
          flex: 1,
          fontSize: 11,
          color: "#c9d1d9",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {source.filename}
        </span>

        {/* Chunk index */}
        <span style={{ fontSize: 10, color: "#484f58", flexShrink: 0 }}>
          chunk {source.chunk_index + 1}
        </span>

        {/* Relevance score */}
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          color: scoreColor(source.score),
          fontFamily: "monospace",
          flexShrink: 0,
        }}>
          {(source.score * 100).toFixed(0)}%
        </span>

        {/* Expand chevron */}
        <span style={{ fontSize: 10, color: "#484f58", transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "none" }}>
          ▾
        </span>
      </div>

      {/* Expanded preview */}
      {expanded && (
        <div style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: "1px solid #1c2128",
          fontSize: 11,
          color: "#8b949e",
          lineHeight: 1.7,
          fontFamily: "'IBM Plex Mono', monospace",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}>
          {source.preview}
          <span style={{ color: "#30363d" }}> …</span>
        </div>
      )}
    </div>
  );
}
