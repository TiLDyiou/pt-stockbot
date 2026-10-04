"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "ai";

interface ChatMessageItemProps {
  message: Message;
  watchlistTickers: string[];
  onOpenChart?: (ticker: string) => void;
}

export function ChatMessageItem({
  message,
  watchlistTickers,
  onOpenChart,
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
        return `Đang lấy giá ${args?.ticker || ""}`;
      case "get_history":
        return `Đang tải lịch sử ${args?.ticker || ""}`;
      case "get_ai_context":
        return `Đang tính toán chỉ báo kỹ thuật ${args?.ticker || ""}`;
      case "get_fundamentals":
        return `Đang đọc báo cáo tài chính ${args?.ticker || ""}`;
      case "get_market_overview":
        return `Đang lấy dữ liệu thị trường`;
      case "compare_symbols":
        return `Đang so sánh ${(args?.tickers || []).join(", ")}`;
      case "search_ticker":
        return `Đang tra cứu mã ${args?.query || ""}`;
      case "get_news":
        return `Đang duyệt tin tức`;
      default:
        return `Đang xử lý ${toolName}`;
    }
  };

  return (
    <div
      className={`flex flex-col mb-3 ${
        isUser ? "items-end" : "items-start"
      }`}
    >
      {/* Label */}
      <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] font-mono text-slate-400">
        <span>{isUser ? "Bạn" : "PhuocThinh AI"}</span>
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[92%] md:max-w-[88%] rounded-lg p-3 text-xs sm:text-sm leading-relaxed ${
          isUser
            ? "bg-emerald-600 text-white rounded-tr-none shadow-sm"
            : "bg-white dark:bg-terminal-panel text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-terminal-border rounded-tl-none shadow-sm"
        }`}
      >
        {/* Tool Call Status */}
        {message.toolInvocations && message.toolInvocations.length > 0 && (
          <div className="mb-2 space-y-1">
            {message.toolInvocations.map((tool) => (
              <div
                key={tool.toolCallId}
                className="flex items-center gap-2 text-xs py-1 px-2.5 rounded bg-slate-50 dark:bg-terminal-subtle text-slate-600 dark:text-slate-300 font-mono border border-slate-200/60 dark:border-terminal-border/80"
              >
                {tool.state === "result" ? (
                  <span className="text-emerald-500 font-bold">✓</span>
                ) : (
                  <span className="animate-spin text-amber-500 font-bold">⟳</span>
                )}
                <span>{getToolDisplayName(tool.toolName, tool.args)}...</span>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none break-words">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ _node, ...props }: any) => (
                  <div className="overflow-x-auto my-2 rounded border border-slate-200 dark:border-terminal-border">
                    <table
                      className="min-w-full divide-y divide-slate-200 dark:divide-terminal-border text-xs text-left"
                      {...props}
                    />
                  </div>
                ),
                th: ({ _node, ...props }: any) => (
                  <th
                    className="px-2.5 py-1.5 bg-slate-100 dark:bg-terminal-subtle font-semibold text-slate-900 dark:text-white"
                    {...props}
                  />
                ),
                td: ({ _node, ...props }: any) => (
                  <td
                    className="px-2.5 py-1.5 border-b border-slate-100 dark:border-terminal-border/60 font-mono text-[11px]"
                    {...props}
                  />
                ),
                p: ({ _node, ...props }: any) => (
                  <p className="mb-1.5 last:mb-0 leading-relaxed" {...props} />
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* Ticker Action Chips */}
      {!isUser && matchedTickers.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 mt-1.5 px-1">
          <span className="text-[10px] text-slate-400 font-mono">Xem nến:</span>
          {matchedTickers.map((ticker) => (
            <button
              key={ticker}
              onClick={() => onOpenChart && onOpenChart(ticker)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"
            >
              <span>📈</span>
              <span>{ticker}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
