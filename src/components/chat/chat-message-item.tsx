"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "ai";
import {
  TrendingUpIcon,
  BotIcon,
  UserIcon,
} from "lucide-animated";
import ThoughtLine from "./thought-line";

interface ChatMessageItemProps {
  message: Message;
  watchlistTickers: string[];
  onOpenChart?: (ticker: string) => void;
  isStreaming?: boolean;
}

export function ChatMessageItem({
  message,
  watchlistTickers,
  onOpenChart,
  isStreaming = false,
}: ChatMessageItemProps) {
  const isUser = message.role === "user";

  const matchedTickers = React.useMemo(() => {
    if (isUser || !message.content) return [];
    const found = new Set<string>();
    for (const t of watchlistTickers) {
      const regex = new RegExp(`\\b${t}\\b`, "i");
      if (regex.test(message.content)) {
        found.add(t);
      }
    }
    return Array.from(found);
  }, [isUser, message.content, watchlistTickers]);

  const getToolDisplayName = (toolName: string, args: any) => {
    switch (toolName) {
      case "get_quote":
        return `Lấy báo giá trực tuyến ${args?.ticker || ""}`;
      case "get_history":
        return `Tải lịch sử giá & nến ${args?.ticker || ""}`;
      case "get_ai_context":
        return `Tính toán chỉ báo RSI, MACD ${args?.ticker || ""}`;
      case "get_fundamentals":
        return `Đọc báo cáo tài chính ${args?.ticker || ""}`;
      case "get_market_overview":
        return `Truy vấn dữ liệu thị trường`;
      case "compare_symbols":
        return `So sánh ${(args?.tickers || []).join(", ")}`;
      case "search_ticker":
        return `Tra cứu mã ${args?.query || ""}`;
      case "get_news":
        return `Cập nhật tin tức`;
      default:
        return `Thực hiện ${toolName}`;
    }
  };

  const hasPendingTools = React.useMemo(() => {
    return Boolean(
      message.toolInvocations &&
      message.toolInvocations.some((t) => t.state !== "result")
    );
  }, [message.toolInvocations]);

  const hasContent = Boolean(message.content && message.content.trim().length > 0);
  const isThinking = isStreaming && (!hasContent || hasPendingTools);

  const steps = React.useMemo(() => {
    if (isUser || !isThinking) return [];
    const list: string[] = [];
    if (message.toolInvocations && message.toolInvocations.length > 0) {
      for (const tool of message.toolInvocations) {
        list.push(getToolDisplayName(tool.toolName, tool.args));
      }
    }
    if (list.length === 0) {
      list.push("Phân tích câu hỏi");
      list.push("Truy vấn dữ liệu thị trường…");
    } else {
      list.push("Đang tổng hợp câu trả lời…");
    }
    return list;
  }, [isUser, message.toolInvocations, isThinking]);

  // Chỉ hiển thị UI Thinking khi đang trong quá trình xử lý/gọi tools.
  // Khi câu trả lời xuất hiện, không hiển thị "Đã suy nghĩ trong ..s" nữa.
  const showThinkingCard = !isUser && isThinking;

  return (
    <div
      className={`flex flex-col mb-3.5 ${
        isUser ? "items-end" : "items-start"
      }`}
    >
      {/* Sender Header - Icon only with glow effect */}
      <div className={`flex items-center mb-1.5 px-0.5 ${isUser ? "justify-end" : "justify-start"}`}>
        {isUser ? (
          <span
            className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600/20 text-emerald-500 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.35)] dark:shadow-[0_0_12px_rgba(16,185,129,0.45)]"
            title="Bạn"
          >
            <UserIcon size={11} animateOnHover />
          </span>
        ) : (
          <span
            className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.35)] dark:shadow-[0_0_12px_rgba(16,185,129,0.45)]"
            title="PhuocThinh AI"
          >
            <BotIcon size={12} animateOnHover />
          </span>
        )}
      </div>

      {/* 1. Standalone Thinking Block (chỉ hiển thị khi đang suy nghĩ/gọi tools) */}
      {showThinkingCard && (
        <div className="w-full max-w-[92%] md:max-w-[88%] mb-2 px-3 py-2 rounded-xl bg-slate-50/90 dark:bg-zinc-900/90 border border-emerald-500/30 dark:border-emerald-500/30 shadow-xs">
          <ThoughtLine
            working={true}
            steps={steps}
            label="Đang suy nghĩ…"
            glyph="sparkle"
            fontSize={12}
            breathPeriod={1.6}
            breathDepth={0.45}
            collapsible
            showTimer
            className="text-slate-600 dark:text-zinc-300 w-full"
          />
        </div>
      )}

      {/* 2. Text Content Bubble */}
      {isUser ? (
        <div className="max-w-[92%] md:max-w-[88%] p-3.5 text-xs sm:text-sm leading-relaxed bg-emerald-600 text-white rounded-2xl rounded-tr-xs shadow-xs whitespace-pre-wrap">
          {message.content}
        </div>
      ) : (
        hasContent && (
          <div className="w-full max-w-[92%] md:max-w-[88%] p-4 text-xs sm:text-sm leading-relaxed bg-white dark:bg-[#171718] text-slate-800 dark:text-zinc-100 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl rounded-tl-xs shadow-xs">
            <div className="prose prose-sm dark:prose-invert max-w-none break-words">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ _node, ...props }: any) => (
                    <h1 className="text-base font-bold text-slate-900 dark:text-white mt-3.5 mb-2 first:mt-0 tracking-tight" {...props} />
                  ),
                  h2: ({ _node, ...props }: any) => (
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white mt-3 mb-1.5 first:mt-0 tracking-tight" {...props} />
                  ),
                  h3: ({ _node, ...props }: any) => (
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-zinc-100 mt-2.5 mb-1 first:mt-0" {...props} />
                  ),
                  h4: ({ _node, ...props }: any) => (
                    <h4 className="text-xs font-semibold text-slate-800 dark:text-zinc-200 mt-2 mb-1 first:mt-0" {...props} />
                  ),
                  p: ({ _node, ...props }: any) => (
                    <p className="mb-2.5 last:mb-0 leading-relaxed text-slate-800 dark:text-zinc-200" {...props} />
                  ),
                  strong: ({ _node, ...props }: any) => (
                    <strong className="font-semibold text-slate-900 dark:text-white" {...props} />
                  ),
                  ul: ({ _node, ...props }: any) => (
                    <ul className="my-2.5 pl-4 space-y-1 list-disc list-outside marker:text-emerald-500 dark:marker:text-emerald-400" {...props} />
                  ),
                  ol: ({ _node, ...props }: any) => (
                    <ol className="my-2.5 pl-4 space-y-1 list-decimal list-outside marker:text-slate-400 dark:marker:text-zinc-500 font-mono" {...props} />
                  ),
                  li: ({ _node, ...props }: any) => (
                    <li className="pl-0.5 leading-relaxed text-slate-800 dark:text-zinc-200" {...props} />
                  ),
                  table: ({ _node, ...props }: any) => (
                    <div className="overflow-x-auto my-3 rounded-xl border border-slate-200/90 dark:border-zinc-800 shadow-2xs">
                      <table className="min-w-full divide-y divide-slate-200 dark:divide-zinc-800 text-xs text-left" {...props} />
                    </div>
                  ),
                  thead: ({ _node, ...props }: any) => (
                    <thead className="bg-slate-100/80 dark:bg-zinc-800/80" {...props} />
                  ),
                  th: ({ _node, ...props }: any) => (
                    <th className="px-3.5 py-2 font-semibold text-slate-700 dark:text-zinc-300 text-[11px] uppercase tracking-wider" {...props} />
                  ),
                  tbody: ({ _node, ...props }: any) => (
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 bg-white dark:bg-[#171718]" {...props} />
                  ),
                  td: ({ _node, ...props }: any) => (
                    <td className="px-3.5 py-2 text-slate-800 dark:text-zinc-200 font-mono text-[11px] tabular-nums" {...props} />
                  ),
                  blockquote: ({ _node, ...props }: any) => (
                    <blockquote className="my-2.5 pl-3 border-l-2 border-emerald-500 italic text-slate-500 dark:text-zinc-400 text-xs leading-relaxed bg-slate-50/70 dark:bg-zinc-900/60 py-1.5 rounded-r-lg" {...props} />
                  ),
                  code: ({ _node, className, children, ...props }: any) => {
                    const isInline = !className?.includes("language-");
                    if (isInline) {
                      return (
                        <code className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] border border-slate-200/60 dark:border-zinc-700/60" {...props}>
                          {children}
                        </code>
                      );
                    }
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  hr: ({ _node, ...props }: any) => (
                    <hr className="my-3 border-slate-200/80 dark:border-zinc-800/80" {...props} />
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>

              {/* Pulsing emerald cursor while text is streaming */}
              {isStreaming && !isThinking && (
                <span className="inline-block w-1.5 h-3.5 ml-1 bg-emerald-500 animate-pulse align-middle rounded-xs" />
              )}
            </div>
          </div>
        )
      )}

      {/* Ticker Action Chips */}
      {!isUser && matchedTickers.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2 px-1">
          <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">Xem nến:</span>
          {matchedTickers.map((ticker) => (
            <button
              key={ticker}
              onClick={() => onOpenChart && onOpenChart(ticker)}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold transition-all shadow-xs"
              title={`Mở biểu đồ ${ticker}`}
            >
              <TrendingUpIcon size={12} className="text-emerald-500" animateOnHover />
              <span>{ticker}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
