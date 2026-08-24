import { useEffect, useState } from "react";

export default function DevErrorOverlay() {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    function onError(e: ErrorEvent) {
      setError(e.error ?? new Error(String(e.message)));
    }
    function onRejection(e: PromiseRejectionEvent) {
      setError((e.reason as Error) ?? new Error(String(e.reason)));
    }

    globalThis.addEventListener?.("error", onError as EventListener);
    globalThis.addEventListener?.("unhandledrejection", onRejection as EventListener);

    return () => {
      globalThis.removeEventListener?.("error", onError as EventListener);
      globalThis.removeEventListener?.("unhandledrejection", onRejection as EventListener);
    };
  }, []);

  if (!error) return null;

  return (
    <div style={{
      position: "fixed",
      left: 12,
      right: 12,
      bottom: 12,
      zIndex: 99999,
      background: "rgba(0,0,0,0.85)",
      color: "white",
      padding: 12,
      borderRadius: 8,
      fontFamily: "monospace",
      maxHeight: "50vh",
      overflow: "auto",
    }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Dev Error</div>
      <div style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{error.stack ?? String(error)}</div>
      <div style={{ marginTop: 8 }}>
        <button
          onClick={() => location.reload()}
          style={{ marginRight: 8, padding: "6px 10px" }}
        >
          Reload
        </button>
        <button onClick={() => setError(null)} style={{ padding: "6px 10px" }}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
