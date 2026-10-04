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

  // Scan text for tickers in watchlist
  const matchedTickers = React.useMemo(() => {
    if (isUser || !message.content) return [];
    const found = new Set<string>();
    for (const t of watchlistTickers) {
      // Regex check word boundary
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
        return `Đang lấy báo giá ${args?.ticker || ""}…`;
      case "get_history":
        return `Đang tải lịch sử giá ${args?.ticker || ""}…`;
      case "get_ai_context":
        return `Đang tính toán chỉ báo kỹ thuật ${args?.ticker || ""}…`;
      case "get_fundamentals":
        return `Đang đọc báo cáo tài chính ${args?.ticker || ""}…`;
      case "get_market_overview":
        return `Đang lấy dữ liệu thị trường…`;
      case "compare_symbols":
        return `Đang so sánh ${(args?.tickers || []).join(", ")}…`;
      case "search_ticker":
        return `Đang tra cứu mã ${args?.query || ""}…`;
      case "get_news":
        return `Đang tìm tin tức…`;
      default:
        return `Đang xử lý ${toolName}…`;
    }
  };

  return (
    <div
      className={`flex flex-col mb-4 ${
        isUser ? "items-end" : "items-start"
      } animate-in fade-in duration-200`}
    >
      <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400">
        <span>{isUser ? "Bạn" : "PhuocThinh AI"}</span>
      </div>

      {/* Message bubble */}
      <div
        className={`max-w-[90%] md:max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
          isUser
            ? "bg-emerald-600 text-white rounded-tr-none shadow-sm"
            : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-tl-none shadow-sm"
        }`}
      >
        {/* Tool invocation status */}
        {message.toolInvocations && message.toolInvocations.length > 0 && (
          <div className="mb-2 space-y-1">
            {message.toolInvocations.map((tool) => (
              <div
                key={tool.toolCallId}
                className="flex items-center gap-2 text-xs py-1 px-2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono"
              >
                {tool.state === "result" ? (
                  <span className="text-emerald-500">✓</span>
                ) : (
                  <span className="animate-spin text-slate-400">⟳</span>
                )}
                <span>{getToolDisplayName(tool.toolName, tool.args)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Content markdown */}
        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none break-words">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ _node, ...props }: any) => (
                  <div className="overflow-x-auto my-2">
                    <table
                      className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-xs text-left"
                      {...props}
                    />
                  </div>
                ),
                th: ({ _node, ...props }: any) => (
                  <th
                    className="px-2 py-1.5 bg-slate-100 dark:bg-slate-800 font-semibold"
                    {...props}
                  />
                ),
                td: ({ _node, ...props }: any) => (
                  <td
                    className="px-2 py-1.5 border-b border-slate-100 dark:border-slate-800"
                    {...props}
                  />
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* Suggested chart chips below assistant message */}
      {!isUser && matchedTickers.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5 px-1">
          <span className="text-[11px] text-slate-400">Xem nhanh:</span>
          {matchedTickers.map((ticker) => (
            <button
              key={ticker}
              onClick={() => onOpenChart && onOpenChart(ticker)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors"
            >
              📈 Xem biểu đồ {ticker}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
