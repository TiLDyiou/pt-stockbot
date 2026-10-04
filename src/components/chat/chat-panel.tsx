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
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="font-bold text-sm tracking-tight text-slate-800 dark:text-slate-100">
            Trợ lý Phân tích Cổ phiếu
          </h2>
        </div>

        <button
          onClick={handleClearHistory}
          disabled={messages.length === 0}
          className="text-xs text-slate-500 hover:text-rose-500 transition-colors disabled:opacity-30 disabled:hover:text-slate-500"
          title="Xóa lịch sử trò chuyện"
        >
          Xóa lịch sử
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
            <div className="text-3xl mb-2">💬</div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
              Bắt đầu phân tích cổ phiếu cùng AI
            </p>
            <p className="text-xs max-w-xs mb-4">
              Hỏi đáp trực tiếp về thị giá, chỉ báo kỹ thuật, báo cáo tài chính hoặc so sánh cổ phiếu.
            </p>

            {/* Suggested prompts */}
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handlePromptClick(prompt)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-700 dark:text-slate-200 hover:border-emerald-500 transition-colors shadow-sm"
                >
                  {prompt}
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

      {/* Watchlist Chips & Actions */}
      <div className="px-4 py-2 bg-white/70 dark:bg-slate-900/70 border-t border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-[11px] text-slate-400 shrink-0">Hỏi nhanh:</span>
          {watchlist.slice(0, 8).map((ticker) => (
            <button
              key={ticker}
              onClick={() => handlePromptClick(`Phân tích ${ticker}`)}
              className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono text-xs font-semibold shrink-0 transition-colors"
            >
              {ticker}
            </button>
          ))}
          {watchlist.length >= 2 && (
            <button
              onClick={handleCompareWatchlist}
              className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 text-xs shrink-0 font-medium transition-colors"
            >
              So sánh watchlist
            </button>
          )}
        </div>
      </div>

      {/* Input Box */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Đặt câu hỏi về cổ phiếu hoặc thị trường..."
            className="flex-1 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
          />
          {isLoading ? (
            <button
              type="button"
              onClick={stop}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs rounded-lg transition-colors"
            >
              Dừng
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition-colors"
            >
              Gửi
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
