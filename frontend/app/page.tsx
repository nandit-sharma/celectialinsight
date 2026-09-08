"use client";

import { useEffect, useRef, useState } from "react";

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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Automatically scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

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
            "Sorry, I couldn't connect to the AI assistant. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
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
    <main className="min-h-screen bg-[#08080c] text-white">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-250px] h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-violet-500/[0.06] blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-[#08080c]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-5xl items-center justify-between px-5">
          
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-sm">
              ✦
            </div>

            <div>
              <h1 className="text-[15px] font-semibold tracking-wide">
                Celestial Insight
              </h1>

              <p className="text-[11px] text-white/35">
                Consultation Intelligence
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>

            <span className="text-[11px] text-white/50">
              AI Assistant
            </span>
          </div>
        </div>
      </header>

      {/* Main Chat */}
      <section className="relative mx-auto flex min-h-[calc(100vh-68px)] max-w-3xl flex-col px-4">
        
        {/* Intro */}
        <div className="pb-7 pt-10 text-center sm:pt-14">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.09] bg-white/[0.04] text-2xl shadow-2xl shadow-black/20">
            ✦
          </div>

          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            How can I help you?
          </h2>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/40">
            Share what's on your mind and I'll help you
            understand your concern and find the right
            consultation.
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-6 overflow-y-auto pb-8">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex items-end gap-3 ${
                message.role === "user"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              {/* AI Avatar */}
              {message.role === "assistant" && (
                <div className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.05] text-xs text-white/70">
                  ✦
                </div>
              )}

              {/* Message */}
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                  message.role === "user"
                    ? "rounded-br-md bg-white text-black"
                    : "rounded-bl-md border border-white/[0.08] bg-white/[0.045] text-white/80"
                }`}
              >
                {message.content}
              </div>

              {/* User Avatar */}
              {message.role === "user" && (
                <div className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-semibold text-black">
                   N 
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex items-end gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.05] text-xs text-white/70">
                ✦
              </div>

              <div className="rounded-2xl rounded-bl-md border border-white/[0.08] bg-white/[0.045] px-4 py-3.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40" />
                </div>
              </div>
            </div>
          )}

          {/* Scroll target */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="sticky bottom-0 pb-5 pt-2">
          
          <div className="rounded-2xl border border-white/[0.1] bg-[#111116]/90 p-2 shadow-2xl shadow-black/30 backdrop-blur-xl transition focus-within:border-white/[0.18]">
            
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                placeholder={
                  isLoading
                    ? "Celestial Insight is thinking..."
                    : "Tell me what's on your mind..."
                }
                rows={1}
                className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-3 text-sm leading-5 text-white outline-none placeholder:text-white/25 disabled:cursor-not-allowed disabled:opacity-50"
              />

              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="flex h-11 min-w-[82px] items-center justify-center rounded-xl bg-white px-4 text-sm font-medium text-black transition-all duration-200 hover:bg-white/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-25"
              >
                {isLoading ? (
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/60 [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/60 [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/60" />
                  </div>
                ) : (
                  <>
                    Send
                    <span className="ml-1.5 text-xs">
                      ↗
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-center gap-2 text-[10px] text-white/20">
            <span>Enter to send</span>
            <span>•</span>
            <span>Shift + Enter for new line</span>
          </div>

          <p className="mt-2 text-center text-[10px] text-white/15">
            Celestial Insight provides AI-assisted consultation
            guidance.
          </p>
        </div>
      </section>
    </main>
  );
}