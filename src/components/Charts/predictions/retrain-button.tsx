"use client";

import { useState } from "react";

export function RetrainButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleRetrain() {
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/retrain", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage("Réentraînement lancé — résultats disponibles dans ~10 min.");
      } else {
        setStatus("error");
        setMessage(data.error ?? "Erreur inconnue");
      }
    } catch {
      setStatus("error");
      setMessage("Erreur réseau");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleRetrain}
        disabled={status === "loading"}
        className="flex items-center gap-2 rounded-lg border border-primary px-3 py-1.5 text-sm font-medium text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-primary dark:text-primary"
      >
        {status === "loading" ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
            </svg>
            Lancement…
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582M20 20v-5h-.581M4.582 9A8 8 0 0120 15M19.418 15A8 8 0 014 9" />
            </svg>
            Relancer la prédiction
          </>
        )}
      </button>
      {message && (
        <p className={`text-xs ${status === "success" ? "text-green-600" : "text-red-500"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
