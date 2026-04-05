/**
 * Message.jsx — Single chat message with optional source citations.
 * Sources render ABOVE the answer bubble (they arrived first via SSE).
 * Streaming cursor blinks while tokens are still arriving.
 */
import SourceCard from "./SourceCard.jsx";

export default function Message({ msg }) {
  const isUser = msg.role === "user";

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: isUser ? "flex-end" : "flex-start",
      gap: 8,
      maxWidth: "100%",
    }}>

      {/* Source citations — only for assistant messages */}
      {!isUser && msg.sources && msg.sources.length > 0 && (
        <div style={{ width: "100%", maxWidth: 680 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 6,
          }}>
            <div style={{ height: 1, flex: 1, background: "#1c2128" }} />
            <span style={{ fontSize: 10, color: "#484f58", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {msg.sources.length} source{msg.sources.length > 1 ? "s" : ""} retrieved
            </span>
            <div style={{ height: 1, flex: 1, background: "#1c2128" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {msg.sources.map((src, i) => (
              <SourceCard key={i} source={src} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Message bubble */}
      <div style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 8,
        flexDirection: isUser ? "row-reverse" : "row",
        maxWidth: 680,
        width: "100%",
      }}>
        {/* Avatar */}
        <div style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: isUser ? "#1d4ed8" : "#1c2128",
          border: `1px solid ${isUser ? "#2563eb" : "#30363d"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          flexShrink: 0,
        }}>
          {isUser ? "U" : "R"}
        </div>

        {/* Bubble */}
        <div style={{
          padding: "11px 16px",
          borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          background: isUser ? "#1d4ed8" : "#161b22",
          border: `1px solid ${isUser ? "#2563eb" : "#21262d"}`,
          fontSize: 13.5,
          lineHeight: 1.75,
          color: isUser ? "#eff6ff" : "#c9d1d9",
          fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          maxWidth: "100%",
        }}>
          {/* Empty state while waiting for first token */}
          {!isUser && msg.streaming && msg.content === "" && (
            <span style={{ color: "#484f58", fontStyle: "italic", fontSize: 12 }}>
              Retrieving relevant context…
            </span>
          )}

          {msg.content}

          {/* Blinking cursor while streaming */}
          {msg.streaming && msg.content !== "" && (
            <span style={{
              display: "inline-block",
              width: 2,
              height: "1em",
              background: "#3b82f6",
              marginLeft: 2,
              verticalAlign: "text-bottom",
              animation: "blink 1s step-end infinite",
            }} />
          )}
        </div>
      </div>

    </div>
  );
}
