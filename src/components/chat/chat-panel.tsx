"use client";

import React, { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import type { Message } from "ai";
import { ChatMessageItem } from "./chat-message-item";
import { loadWatchlist, STORAGE_KEYS } from "@/lib/storage/layout-storage";

interface ChatPanelProps {
  onOpenChart?: (ticker: string) => void;
}

const SUGGESTED_PROMPTS = [
  "Phân tích kỹ thuật FPT",
  "So sánh VCB, TCB, MBB",
  "Thị trường hôm nay thế nào?",
];

interface PersistedHistory {
  version: 1;
  messages: Message[];
}

export function ChatPanel({ onOpenChart }: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [isClientReady, setIsClientReady] = useState(false);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    setMessages,
    append,
  } = useChat({
    api: "/api/chat",
    maxSteps: 5,
  });

  // Load chat history and watchlist from localStorage after mount only
  useEffect(() => {
    try {
      const storedWatchlist = loadWatchlist();
      setWatchlist(storedWatchlist);

      const rawChat = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
      if (rawChat) {
        const parsed: PersistedHistory = JSON.parse(rawChat);
        if (parsed && parsed.version === 1 && Array.isArray(parsed.messages)) {
          setMessages(parsed.messages.slice(-50));
        }
      }
    } catch (err) {
      console.warn("Không thể tải lịch sử chat từ localStorage:", err);
    } finally {
      setIsClientReady(true);
    }
  }, [setMessages]);

  // Persist messages to localStorage on change (capped at 50)
  useEffect(() => {
    if (!isClientReady || messages.length === 0) return;
    try {
      const dataToSave: PersistedHistory = {
        version: 1,
        messages: messages.slice(-50),
      };
      localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(dataToSave));
    } catch (err) {
      console.warn("Không thể lưu lịch sử chat:", err);
    }
  }, [messages, isClientReady]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleClearHistory = () => {
    if (confirm("Xóa toàn bộ lịch sử trò chuyện?")) {
      setMessages([]);
      try {
        localStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
      } catch {
        // ignore
      }
    }
  };

  const handleCompareWatchlist = () => {
    if (watchlist.length < 2) {
      alert("Watchlist cần ít nhất 2 mã để so sánh.");
      return;
    }
    const tickersToCompare = watchlist.slice(0, 5);
    append({
      role: "user",
      content: `So sánh các mã cổ phiếu: ${tickersToCompare.join(", ")}`,
    });
  };

  const handlePromptClick = (promptText: string) => {
    append({
      role: "user",
      content: promptText,
    });
  };

  return (
    <div className="flex flex-col h-full rounded-2xl glass-surface overflow-hidden shadow-ambient-sm border border-black/[0.06] dark:border-white/[0.08]">
      {/* Sleek Subheader */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.05] dark:border-white/[0.07] bg-white/40 dark:bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
          <h2 className="font-semibold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Hội thoại Phân tích
          </h2>
        </div>

        <button
          onClick={handleClearHistory}
          disabled={messages.length === 0}
          className="text-[11px] font-medium text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-30 disabled:hover:text-slate-400"
          title="Xóa phiên làm việc"
        >
          Xóa lịch sử
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="relative mb-4 flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20 text-emerald-500 text-2xl shadow-ambient-sm">
              ✨
              <div className="absolute inset-0 rounded-2xl bg-emerald-500/10 blur-xl -z-10" />
            </div>

            <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white mb-1">
              Phân tích Thị trường & Cổ phiếu
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-6 leading-relaxed">
              Trợ lý thông minh khai thác dữ liệu trực tiếp từ HOSE, HNX, UPCoM với chỉ báo kỹ thuật và tài chính chuyên sâu.
            </p>

            {/* Suggested prompts pills with button-in-button styling */}
            <div className="flex flex-col gap-2 w-full max-w-xs">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handlePromptClick(prompt)}
                  className="group flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-100/70 dark:bg-white/[0.04] hover:bg-slate-200/70 dark:hover:bg-white/[0.08] border border-black/[0.04] dark:border-white/[0.06] text-xs font-medium text-slate-700 dark:text-slate-200 transition-all duration-200 active:scale-[0.98]"
                >
                  <span>{prompt}</span>
                  <span className="w-5 h-5 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-[10px] text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all">
                    ↗
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <ChatMessageItem
              key={m.id}
              message={m}
              watchlistTickers={watchlist}
              onOpenChart={onOpenChart}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Watchlist Quick Actions Bar */}
      <div className="px-4 py-2 bg-slate-50/60 dark:bg-white/[0.02] border-t border-black/[0.04] dark:border-white/[0.06]">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 shrink-0">
            Hỏi nhanh:
          </span>
          {watchlist.slice(0, 8).map((ticker) => (
            <button
              key={ticker}
              onClick={() => handlePromptClick(`Phân tích ${ticker}`)}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-white/[0.05] hover:bg-slate-100 dark:hover:bg-white/[0.1] border border-black/[0.04] dark:border-white/[0.06] text-slate-800 dark:text-slate-200 font-mono text-xs font-semibold shrink-0 transition-all active:scale-[0.96]"
            >
              {ticker}
            </button>
          ))}
          {watchlist.length >= 2 && (
            <button
              onClick={handleCompareWatchlist}
              className="group flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs shrink-0 font-medium transition-all active:scale-[0.96]"
            >
              <span>So sánh Watchlist</span>
              <span className="text-[10px] group-hover:translate-x-0.5 transition-transform">
                →
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Island Input Bar with Nested Button */}
      <div className="p-3 bg-white/70 dark:bg-white/[0.02] border-t border-black/[0.05] dark:border-white/[0.07]">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Hỏi về mã cổ phiếu, chỉ báo kỹ thuật, P/E..."
            className="w-full pl-4 pr-24 py-3 text-xs sm:text-sm bg-slate-100/80 dark:bg-[#0c1017] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white placeholder:text-slate-400 shadow-inner"
          />

          <div className="absolute right-1.5 flex items-center">
            {isLoading ? (
              <button
                type="button"
                onClick={stop}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl transition-all shadow-sm active:scale-[0.96]"
              >
                Dừng
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="group flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-xs rounded-xl transition-all shadow-ambient-sm active:scale-[0.96]"
              >
                <span>Gửi</span>
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] group-hover:translate-x-0.5 transition-transform">
                  ↑
                </span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
