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
        return `Đang truy vấn báo giá ${args?.ticker || ""}`;
      case "get_history":
        return `Đang tổng hợp dữ liệu nến ${args?.ticker || ""}`;
      case "get_ai_context":
        return `Đang phân tích chỉ báo kỹ thuật ${args?.ticker || ""}`;
      case "get_fundamentals":
        return `Đang đọc báo cáo tài chính ${args?.ticker || ""}`;
      case "get_market_overview":
        return `Đang đọc diễn biến toàn thị trường`;
      case "compare_symbols":
        return `Đang đối sánh ${(args?.tickers || []).join(", ")}`;
      case "search_ticker":
        return `Đang tra cứu cơ sở dữ liệu mã ${args?.query || ""}`;
      case "get_news":
        return `Đang duyệt tin tức tài chính`;
      default:
        return `Đang xử lý ${toolName}`;
    }
  };

  return (
    <div
      className={`flex flex-col mb-4 ${
        isUser ? "items-end" : "items-start"
      } animate-in fade-in slide-in-from-bottom-2 duration-300`}
    >
      {/* Role Eyebrow Tag */}
      <div className="flex items-center gap-1.5 mb-1 px-2 text-[10px] font-mono tracking-widest uppercase text-slate-400">
        <span>{isUser ? "Nhà đầu tư" : "Trợ lý Phân tích"}</span>
        {!isUser && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        )}
      </div>

      {/* Message Bubble: Double-Bezel Architecture */}
      {isUser ? (
        <div className="max-w-[88%] rounded-2xl rounded-tr-none px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-ambient-sm text-xs sm:text-sm font-medium leading-relaxed">
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>
      ) : (
        <div className="max-w-[94%] md:max-w-[90%] double-bezel-shell">
          <div className="double-bezel-core p-4 text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-100">
            {/* Tool Execution Pulse Badge */}
            {message.toolInvocations && message.toolInvocations.length > 0 && (
              <div className="mb-3 space-y-1.5">
                {message.toolInvocations.map((tool) => (
                  <div
                    key={tool.toolCallId}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] text-xs font-mono"
                  >
                    {tool.state === "result" ? (
                      <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-500 font-bold text-[10px]">
                        ✓
                      </span>
                    ) : (
                      <span className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/20 text-amber-500 font-bold text-[10px] animate-spin">
                        ⟳
                      </span>
                    )}
                    <span className="text-slate-600 dark:text-slate-300 text-[11px]">
                      {getToolDisplayName(tool.toolName, tool.args)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Markdown Body */}
            <div className="prose prose-sm dark:prose-invert max-w-none break-words font-sans space-y-2">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ _node, ...props }: any) => (
                    <div className="overflow-x-auto my-3 rounded-xl border border-black/[0.06] dark:border-white/[0.08]">
                      <table
                        className="min-w-full divide-y divide-slate-200 dark:divide-white/[0.06] text-xs text-left"
                        {...props}
                      />
                    </div>
                  ),
                  th: ({ _node, ...props }: any) => (
                    <th
                      className="px-3 py-2 bg-slate-50 dark:bg-white/[0.03] font-semibold text-slate-900 dark:text-white"
                      {...props}
                    />
                  ),
                  td: ({ _node, ...props }: any) => (
                    <td
                      className="px-3 py-2 border-b border-black/[0.03] dark:border-white/[0.04] text-slate-700 dark:text-slate-300 font-mono text-[11px]"
                      {...props}
                    />
                  ),
                  p: ({ _node, ...props }: any) => (
                    <p className="mb-2 last:mb-0 leading-relaxed" {...props} />
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {/* Suggested Chart Interactive Island Chips */}
      {!isUser && matchedTickers.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2 px-1">
          <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400">
            Xem nến:
          </span>
          {matchedTickers.map((ticker) => (
            <button
              key={ticker}
              onClick={() => onOpenChart && onOpenChart(ticker)}
              className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-all duration-300 active:scale-[0.97]"
            >
              <span className="font-mono font-bold tracking-wide">{ticker}</span>
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] group-hover:translate-x-0.5 transition-transform">
                ↗
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
