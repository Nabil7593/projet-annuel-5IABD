"use client";

import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Quel est mon CA ce mois-ci ?",
  "Quel est mon fournisseur le plus cher ?",
  "Quelle est ma marge brute ce mois ?",
  "Résume mes charges du mois",
];

export default function AgentPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);

    // Placeholder for streaming response
    setMessages([...history, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erreur");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: full }]);
      }
    } catch (e: any) {
      setMessages([
        ...history,
        { role: "assistant", content: `Erreur : ${e.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col">
      {/* Header */}
      <div className="border-b border-stroke px-6 py-4 dark:border-stroke-dark">
        <h1 className="text-xl font-bold text-dark dark:text-white">
          Assistant IA RestoLens
        </h1>
        <p className="text-sm text-dark-6 dark:text-dark-4">
          Posez vos questions sur votre activité — CA, fournisseurs, charges, marges
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="mt-8 flex flex-col items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/>
                <path d="M2 14h2M20 14h2M15 13v2M9 13v2"/>
              </svg>
            </div>
            <p className="text-center text-dark-6 dark:text-dark-4">
              Bonjour ! Je connais toutes les données de votre restaurant.<br />
              Que voulez-vous savoir ?
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-stroke px-4 py-2 text-sm text-dark transition hover:border-primary hover:text-primary dark:border-dark-3 dark:text-white"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-primary text-white rounded-br-sm"
                  : "bg-gray-2 text-dark dark:bg-dark-2 dark:text-white rounded-bl-sm"
              }`}
            >
              {msg.content}
              {msg.role === "assistant" && loading && i === messages.length - 1 && msg.content === "" && (
                <span className="inline-flex gap-1">
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce [animation-delay:0.1s]">.</span>
                  <span className="animate-bounce [animation-delay:0.2s]">.</span>
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-stroke px-6 py-4 dark:border-stroke-dark">
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex gap-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez votre question..."
            disabled={loading}
            className="flex-1 rounded-xl border border-stroke bg-transparent px-4 py-3 text-sm outline-none transition focus:border-primary disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:opacity-50"
          >
            Envoyer
          </button>
        </form>
      </div>
    </div>
  );
}
