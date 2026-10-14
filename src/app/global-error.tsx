"use client";

import { useEffect } from "react";

/**
 * Root-level error boundary. This is the ONLY boundary that catches errors
 * thrown by the root `layout.tsx` itself or by components rendered directly
 * inside it (e.g. `<Navbar />`, which performs an async Supabase call on
 * every request) — `error.tsx` does not cover that case. Per Next.js
 * convention this file must render its own `<html>` and `<body>`, since it
 * replaces the entire root layout when triggered. Inline styles are used
 * instead of Tailwind classes: if the root layout crashed, there is no
 * guarantee the rest of the app's styling pipeline rendered successfully.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled root layout error:", error);
  }, [error]);

  return (
    <html lang="es-AR">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "2rem",
          fontFamily: "sans-serif",
          backgroundColor: "#faf7f2",
          color: "#1a1a1a",
        }}
      >
        <p style={{ fontSize: "0.75rem", letterSpacing: "0.1em", opacity: 0.5 }}>
          ERROR CRÍTICO
        </p>
        <h1 style={{ marginTop: "1rem", fontSize: "1.75rem" }}>
          No pudimos cargar Cairo
        </h1>
        <p style={{ marginTop: "0.75rem", maxWidth: "28rem", fontSize: "0.9rem", opacity: 0.7 }}>
          Ocurrió un error inesperado al iniciar la aplicación. Ya estamos al
          tanto. Probá recargar la página en unos instantes.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: "2rem",
            borderRadius: "9999px",
            backgroundColor: "#1a1a1a",
            color: "#faf7f2",
            padding: "0.75rem 1.5rem",
            fontSize: "0.9rem",
            fontWeight: 500,
            border: "none",
            cursor: "pointer",
          }}
        >
          Intentar de nuevo
        </button>
      </body>
    </html>
  );
}
