"use client";

import { useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm Celestial Insight. How can I help you today?",
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
  if (!input.trim()) return;

  const message = input.trim();

  const userMessage: Message = {
    role: "user",
    content: message,
  };

  setMessages((prev) => [...prev, userMessage]);
  setInput("");
  setIsLoading(true);

  try {
    const response = await fetch(
      "http://localhost:5000/api/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Something went wrong"
      );
    }

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: data.response,
      },
    ]);

  } catch (error) {

    console.error("Chat request failed:", error);

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content:
          "Sorry, I couldn't connect to the AI assistant.",
      },
    ]);
  }
};

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <main className="min-h-screen bg-[#0b0b0f] text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <div>
            <h1 className="text-lg font-semibold tracking-wide">
              Celestial Insight
            </h1>

            <p className="text-xs text-white/40">
              Consultation Intelligence
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-white/50">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            AI Assistant
          </div>
        </div>
      </header>

      {/* Chat */}
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col px-4">
        {/* Intro */}
        <div className="pb-6 pt-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">
            ✦
          </div>

          <h2 className="text-2xl font-semibold">
            How can I help you?
          </h2>

          <p className="mt-2 text-sm text-white/45">
            Share what's on your mind and I'll help you find the
            right consultation.
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-5 overflow-y-auto pb-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "bg-white text-black"
                    : "border border-white/10 bg-white/5 text-white/80"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="sticky bottom-0 pb-6">
          <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2 backdrop-blur">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell me what's on your mind..."
              rows={1}
              className="max-h-32 flex-1 resize-none bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-white/30"
            />

            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Send
            </button>
          </div>

          <p className="mt-2 text-center text-[11px] text-white/25">
            Celestial Insight provides AI-assisted consultation
            guidance.
          </p>
        </div>
      </section>
    </main>
  );
}