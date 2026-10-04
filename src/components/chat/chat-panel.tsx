"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import type { Message } from "ai";
import { ChatMessageItem } from "./chat-message-item";
import { loadWatchlist, STORAGE_KEYS } from "@/lib/storage/layout-storage";
import {
  DeleteIcon,
  ArrowRightIcon,
  SendIcon,
  BanIcon,
} from "lucide-animated";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";
import { cn } from "@/lib/utils/cn";
import ThoughtLine from "./thought-line";
import ElectricLogo from "./ElectricLogo";
import BorderGlow from "./BorderGlow";

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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [isClientReady, setIsClientReady] = useState(false);

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isAtBottomRef.current = distanceToBottom <= 100;
  }, []);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = messagesContainerRef.current;
    if (!el) return;
    if (smooth) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  const {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    setMessages,
    append,
  } = useChat({
    api: "/api/chat",
    maxSteps: 10,
  });

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 36,
    maxHeight: 180,
  });
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounterRef = useRef(0);
  const lastDropTimeRef = useRef(0);

  // Automatically adjust textarea height whenever input changes
  useEffect(() => {
    adjustHeight();
  }, [input, adjustHeight]);

  const isDroppableToChat = (e: React.DragEvent) => {
    // Exclude OS files
    if (e.dataTransfer.types.includes("Files")) {
      return false;
    }
    // Strictly forbid chart and overview modules
    if (
      e.dataTransfer.types.includes("application/x-module-chart") ||
      e.dataTransfer.types.includes("application/x-module-overview")
    ) {
      return false;
    }
    // Allow Watchlist module
    if (e.dataTransfer.types.includes("application/x-module-watchlist")) {
      return true;
    }
    // Any other generic dashboard module (if not watchlist) is forbidden
    if (e.dataTransfer.types.includes("application/x-dashboard-module")) {
      return false;
    }
    // Stock ticker (via custom MIME or text/plain)
    return (
      e.dataTransfer.types.includes("application/x-stock-ticker") ||
      e.dataTransfer.types.includes("text/plain")
    );
  };

  const handleDragEnter = (e: React.DragEvent) => {
    if (!isDroppableToChat(e)) return;
    e.preventDefault();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) {
      setIsDraggingOver(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isDroppableToChat(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDraggingOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);

    // Guard against stutter drops / duplicate bubbling within 250ms
    const now = Date.now();
    if (now - lastDropTimeRef.current < 250) {
      return;
    }
    lastDropTimeRef.current = now;

    // 1. Check for module drops
    const moduleType =
      e.dataTransfer.getData("application/x-dashboard-module") ||
      e.dataTransfer.getData("application/x-module-watchlist") ||
      e.dataTransfer.getData("application/x-module-chart") ||
      e.dataTransfer.getData("application/x-module-overview");

    if (moduleType) {
      // Strictly ignore and reject chart and overview modules
      if (moduleType !== "watchlist") {
        return;
      }

      // ONLY Watchlist module is permitted
      const currentWatchlist = loadWatchlist();
      const tickers =
        currentWatchlist && currentWatchlist.length > 0
          ? currentWatchlist
          : watchlist;

      if (!tickers || tickers.length === 0) {
        return;
      }

      const watchlistLines = tickers
        .map((t) => `Phân tích xu hướng của ${t}`)
        .join("\n");

      setInput((prev) => {
        const trimmed = prev.trim();
        if (!trimmed) {
          return watchlistLines;
        }
        return `${prev.trimEnd()}\n${watchlistLines}`;
      });

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const len = textareaRef.current.value.length;
          textareaRef.current.selectionStart = len;
          textareaRef.current.selectionEnd = len;
          textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
        }
        adjustHeight();
      }, 50);
      return;
    }

    // 2. Check for stock ticker drops
    const raw =
      e.dataTransfer.getData("application/x-stock-ticker") ||
      e.dataTransfer.getData("text/plain");
    if (!raw) return;

    const lower = raw.trim().toLowerCase();
    // If the dropped text is "chart" or "overview", reject immediately
    if (["chart", "overview", "quick_quote"].includes(lower)) {
      return;
    }

    // If the dropped text is "watchlist" (from plain text drop of the module)
    if (lower === "watchlist") {
      const currentWatchlist = loadWatchlist();
      const tickers =
        currentWatchlist && currentWatchlist.length > 0
          ? currentWatchlist
          : watchlist;

      if (tickers && tickers.length > 0) {
        const watchlistLines = tickers
          .map((t) => `Phân tích xu hướng của ${t}`)
          .join("\n");
        setInput((prev) => {
          const trimmed = prev.trim();
          if (!trimmed) return watchlistLines;
          return `${prev.trimEnd()}\n${watchlistLines}`;
        });
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            const len = textareaRef.current.value.length;
            textareaRef.current.selectionStart = len;
            textareaRef.current.selectionEnd = len;
            textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
          }
          adjustHeight();
        }, 50);
      }
      return;
    }

    // 3. Normal stock ticker
    const ticker = raw
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");

    if (ticker.length >= 2 && ticker.length <= 10) {
      const promptText = `Phân tích xu hướng của ${ticker}`;
      setInput((prev) => {
        const trimmed = prev.trim();
        if (!trimmed) {
          return promptText;
        }
        const lines = prev.split("\n").map((l) => l.trim());
        if (lines.includes(promptText)) {
          return prev;
        }
        return `${prev.trimEnd()}\n${promptText}`;
      });

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const len = textareaRef.current.value.length;
          textareaRef.current.selectionStart = len;
          textareaRef.current.selectionEnd = len;
          textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
        }
        adjustHeight();
      }, 50);
    }
  };

  const handleContainerClick = () => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const onFormSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    isAtBottomRef.current = true;
    handleSubmit(e);
    adjustHeight(true);
    requestAnimationFrame(() => scrollToBottom(false));
  };

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
      localStorage.setItem(
        STORAGE_KEYS.CHAT_HISTORY,
        JSON.stringify(dataToSave),
      );
    } catch (err) {
      console.warn("Không thể lưu lịch sử chat:", err);
    }
  }, [messages, isClientReady]);

  // Auto-scroll instantly during streaming to eliminate jitter and up-down oscillation
  useEffect(() => {
    if (isAtBottomRef.current) {
      scrollToBottom(false);
    }
  }, [messages, isLoading, scrollToBottom]);

  // Initial load auto-scroll
  useEffect(() => {
    if (isClientReady) {
      scrollToBottom(false);
    }
  }, [isClientReady, scrollToBottom]);

  const handleClearHistory = () => {
    if (messages.length === 0) return;
    const confirmed = window.confirm(
      "CẢNH BÁO: Toàn bộ lịch sử trò chuyện và phân tích sẽ bị xóa vĩnh viễn.\n\nBạn có chắc chắn muốn xóa không?",
    );
    if (confirmed) {
      setMessages([]);
      try {
        localStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
      } catch {
        // ignore
      }
    }
  };

  const handlePromptClick = (promptText: string) => {
    isAtBottomRef.current = true;
    append({
      role: "user",
      content: promptText,
    });
    requestAnimationFrame(() => scrollToBottom(false));
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative flex flex-col h-full bg-slate-50 dark:bg-[#0c0c0e] border-r border-slate-200 dark:border-zinc-800 select-none transition-colors",
        isDraggingOver &&
          "ring-2 ring-inset ring-emerald-500 bg-emerald-50 dark:bg-emerald-950",
      )}
    >
      {/* Message List */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3 select-text"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div
              style={{ width: '100%', height: '200px', position: 'relative' }}
              className="max-w-[280px] mx-auto mb-1 flex items-center justify-center"
            >
              <ElectricLogo
                src="/candlestick.svg"
                color="#a7f3d0"
                glowColor="#10b981"
                scale={0.75}
                strands={4}
                bend={0.6}
                crackle={1.5}
                arcs={1}
                speed={2.5}
                interactive
                intensity={1}
                glow={1}
                thickness={1.5}
                flicker={0.6}
                fill={0}
                cursorIntensity={0.75}
                cursorRadius={100}
              />
            </div>

            <div className="flex flex-col gap-2 w-full max-w-xs">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handlePromptClick(prompt)}
                  className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#171718] hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-xs text-left text-slate-800 dark:text-zinc-200 transition-all shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 cursor-pointer"
                >
                  <span className="font-medium">{prompt}</span>
                  <ArrowRightIcon
                    size={14}
                    className="float-right text-emerald-500 mt-0.5"
                    animateOnHover
                  />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m, index) => (
              <ChatMessageItem
                key={m.id}
                message={m}
                watchlistTickers={watchlist}
                onOpenChart={onOpenChart}
                isStreaming={isLoading && index === messages.length - 1}
              />
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex flex-col mb-3.5 items-start">
                <div className="w-full max-w-[92%] md:max-w-[88%] mb-2 px-3 py-2 rounded-xl bg-slate-50/90 dark:bg-zinc-900/90 border border-emerald-500/30 dark:border-emerald-500/30 shadow-xs">
                  <ThoughtLine
                    working={true}
                    steps={[
                      "Đang phân tích câu hỏi…",
                      "Đang truy vấn dữ liệu nguồn…",
                      "Đang soạn thảo câu trả lời…",
                    ]}
                    label="Đang suy nghĩ…"
                    doneLabel="Đã suy nghĩ trong"
                    glyph="sparkle"
                    fontSize={12}
                    breathPeriod={1.6}
                    breathDepth={0.45}
                    settleDuration={350}
                    settleBlur={2}
                    collapsible
                    showTimer
                    className="text-slate-600 dark:text-zinc-300 w-full"
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="relative p-2.5 bg-white dark:bg-[#171718] border-t border-slate-200 dark:border-zinc-800">
        <form onSubmit={onFormSubmit} className="w-full">
          <BorderGlow
            edgeSensitivity={9}
            glowColor="40 80 80"
            backgroundColor="#120F17"
            borderRadius={28}
            glowRadius={30}
            glowIntensity={0.5}
            coneSpread={11}
            animated
            colors={['#c084fc', '#f472b6', '#38bdf8']}
            className="w-full"
          >
            <div
              aria-label="Khung nhập câu hỏi AI"
              className={cn(
                "relative flex w-full cursor-text items-center rounded-[28px] text-left transition-all duration-200",
                "bg-transparent border-none outline-none",
                isDraggingOver &&
                  "bg-emerald-100 dark:bg-emerald-950",
              )}
              onClick={handleContainerClick}
            >
              {isDraggingOver && (
                <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[28px] bg-emerald-500 dark:bg-emerald-950 border-2 border-dashed border-emerald-500 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-semibold animate-pulse pointer-events-none">
                  <span>Thả mã hoặc module Danh mục để phân tích xu hướng</span>
                </div>
              )}
              <div className="w-full max-h-[180px] overflow-y-auto">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    handleInputChange(e);
                    adjustHeight();
                  }}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (input.trim() && !isLoading) {
                        onFormSubmit();
                      }
                    }
                  }}
                  rows={1}
                  placeholder="Hỏi AI về cổ phiếu hoặc thị trường"
                  className="w-full resize-none border-none bg-transparent pl-4 pr-[76px] py-2.5 text-xs sm:text-sm leading-5 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-0 text-slate-900 dark:text-white block"
                />
              </div>

              <div className="absolute right-2 bottom-1.5 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="flex items-center justify-center h-7 w-7 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-xs cursor-pointer active:scale-95 transition-all shrink-0"
                  title="Xóa toàn bộ lịch sử trò chuyện (kèm cảnh báo)"
                >
                  <DeleteIcon size={13} animateOnHover />
                </button>

                {isLoading ? (
                  <button
                    type="button"
                    onClick={stop}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    title="Dừng tạo phản hồi"
                  >
                    <BanIcon size={12} animateOnHover />
                    <span>Dừng</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className={cn(
                      "flex items-center justify-center h-7 w-7 rounded-xl transition-all",
                      input.trim()
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer active:scale-95"
                        : "bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-600 cursor-not-allowed",
                    )}
                    title="Gửi câu hỏi"
                  >
                    <SendIcon size={13} animateOnHover />
                  </button>
                )}
              </div>
            </div>
          </BorderGlow>
        </form>
      </div>
    </div>
  );
}
