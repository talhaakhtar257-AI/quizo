"use client";

import { useEffect } from "react";

// error.tsx catches a failure inside a page. This catches a failure in the
// root layout itself, which is the one case error.tsx cannot help with —
// without this file the visitor gets Next.js's own unstyled crash page, with
// no branding, no theme, and no idea what to do next. It has to render its
// own <html> and <body> because the layout that normally provides them is
// the thing that broke, and it cannot use the shared UI components for the
// same reason.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[quizo] root layout failed:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          fontFamily: "system-ui, sans-serif",
          background: "#F8FAFC",
          color: "#0F172A",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 0.75rem" }}>
            Quizo could not load
          </h1>
          <p style={{ fontSize: "0.95rem", lineHeight: 1.6, color: "#475569", margin: "0 0 1.5rem" }}>
            Something went wrong before the page could start. Nothing has been lost. Try again, and
            if it keeps happening please get in touch.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              minHeight: "44px",
              padding: "0 1.5rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "#F4A300",
              color: "#0A1F17",
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
