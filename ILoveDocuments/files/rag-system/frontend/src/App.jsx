/**
 * App.jsx — Root layout.
 *
 * Architecture: Feature-based component structure.
 *   App (layout shell)
 *   ├── DocumentPanel (sidebar: upload + document list)
 *   └── ChatWindow (main: messages + input)
 *
 * State lives in Zustand store — components are pure presentational.
 */
import DocumentPanel from "./components/DocumentPanel.jsx";
import ChatWindow from "./components/ChatWindow.jsx";

export default function App() {
  return (
    <>
      {/* Global CSS injected here to avoid a separate CSS file */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; overflow: hidden; }
        body { background: #0d1117; font-family: 'IBM Plex Sans', system-ui, sans-serif; }

        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap');

        /* Custom scrollbar */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #21262d; border-radius: 3px; }

        /* Streaming cursor blink */
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        /* Spinner */
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        button:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
        textarea:focus { box-shadow: none; }
      `}</style>

      <div style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "#0d1117",
      }}>
        <DocumentPanel />
        <ChatWindow />
      </div>
    </>
  );
}
