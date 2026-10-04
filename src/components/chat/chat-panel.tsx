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
      console.warn("Không thể tải lịch sử chat:", err);
    } finally {
      setIsClientReady(true);
    }
  }, [setMessages]);

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
    <div className="flex flex-col h-full bg-white dark:bg-terminal-panel border-r border-slate-200 dark:border-terminal-border select-none">
      {/* Header (38px) */}
      <div className="h-[38px] px-3 border-b border-slate-200 dark:border-terminal-border flex items-center justify-between shrink-0 bg-slate-50 dark:bg-terminal-header">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <h2 className="font-semibold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Trợ lý AI Phân tích
          </h2>
        </div>

        <button
          onClick={handleClearHistory}
          disabled={messages.length === 0}
          className="text-xs text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-30"
          title="Xóa lịch sử trò chuyện"
        >
          Xóa lịch sử
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 select-text">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg mb-2 border border-emerald-200 dark:border-emerald-800">
              💬
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
              Phân tích Chứng khoán Thông minh
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-4 leading-relaxed">
              Trợ lý tự động gọi tools lấy giá, lịch sử, RSI, MACD, báo cáo tài chính và tổng quan thị trường.
            </p>

            <div className="flex flex-col gap-1.5 w-full max-w-xs">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handlePromptClick(prompt)}
                  className="px-3 py-2 rounded bg-slate-50 dark:bg-terminal-subtle hover:bg-slate-100 dark:hover:bg-terminal-hover border border-slate-200 dark:border-terminal-border text-xs text-left text-slate-700 dark:text-slate-300 transition-colors"
                >
                  {prompt} →
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

      {/* Watchlist Quick Queries Bar */}
      <div className="px-3 py-1.5 bg-slate-50 dark:bg-terminal-header border-t border-slate-200 dark:border-terminal-border">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs no-scrollbar">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider shrink-0">
            Hỏi nhanh:
          </span>
          {watchlist.slice(0, 8).map((ticker) => (
            <button
              key={ticker}
              onClick={() => handlePromptClick(`Phân tích ${ticker}`)}
              className="px-2 py-0.5 rounded bg-white dark:bg-terminal-subtle hover:bg-slate-100 dark:hover:bg-terminal-hover border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono text-xs font-semibold shrink-0 transition-colors"
            >
              {ticker}
            </button>
          ))}
          {watchlist.length >= 2 && (
            <button
              onClick={handleCompareWatchlist}
              className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 text-xs shrink-0 font-medium transition-colors"
            >
              So sánh watchlist
            </button>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white dark:bg-terminal-panel border-t border-slate-200 dark:border-terminal-border">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Hỏi về mã chứng khoán (VD: Phân tích FPT, SSI...)"
            className="flex-1 px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-terminal-subtle border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-white"
          />

          {isLoading ? (
            <button
              type="button"
              onClick={stop}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs rounded transition-colors"
            >
              Dừng
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-medium text-xs rounded transition-colors"
            >
              Gửi
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
