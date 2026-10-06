"use client";

import React, { useEffect, useState, useCallback } from "react";
import type { NewsItem } from "@/lib/vnstock/types";
import { RefreshCwIcon, XIcon } from "lucide-animated";
import { Newspaper, ExternalLink, Maximize2, Minimize2, Calendar } from "lucide-react";

interface StockNewsWidgetProps {
  symbol?: string;
  onSelectSymbol?: (symbol: string) => void;
  onCloseModule?: () => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  dragHandle?: React.ReactNode;
}

export function StockNewsWidget({
  symbol = "VNINDEX",
  onSelectSymbol: _onSelectSymbol,
  onCloseModule,
  isMaximized = false,
  onToggleMaximize,
  dragHandle,
}: StockNewsWidgetProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSpecificStock = Boolean(
    symbol &&
    symbol !== "VNINDEX" &&
    symbol !== "MARKET" &&
    symbol !== "ALL"
  );

  // Mặc định luôn là "market" (Tin thị trường chung)
  const [activeTab, setActiveTab] = useState<"market" | "symbol">("market");

  // Khi người dùng chọn một mã cổ phiếu cụ thể (ví dụ HPG, FPT), tự động chuyển sang tab mã đó
  useEffect(() => {
    if (
      symbol &&
      symbol !== "VNINDEX" &&
      symbol !== "MARKET" &&
      symbol !== "ALL"
    ) {
      setActiveTab("symbol");
    }
  }, [symbol]);

  const fetchNews = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParam = activeTab === "market" ? "MARKET" : symbol;
      const res = await fetch(
        `/api/news?symbol=${encodeURIComponent(queryParam)}&limit=15`
      );
      if (!res.ok) throw new Error("Không thể tải tin tức");
      const json = await res.json();
      setNews(json.news || []);
    } catch (err: any) {
      setError(err?.message || "Lỗi tải tin tức");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, symbol]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const formatNewsDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) return "Vừa xong";
      if (diffHours < 24) return `${diffHours} giờ trước`;
      if (diffDays === 1) return "Hôm qua";
      if (diffDays < 7) return `${diffDays} ngày trước`;

      return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
        .toString()
        .padStart(2, "0")}/${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  const getSourceBadgeColor = (source: string) => {
    const s = source.toLowerCase();
    if (s.includes("vietstock")) return "bg-blue-600 text-white";
    if (s.includes("cafef")) return "bg-orange-600 text-white";
    if (s.includes("vnexpress")) return "bg-red-600 text-white";
    if (s.includes("người quan sát") || s.includes("nqs"))
      return "bg-purple-600 text-white";
    if (s.includes("tin nhanh") || s.includes("đtck"))
      return "bg-emerald-600 text-white";
    return "bg-slate-600 dark:bg-zinc-700 text-white";
  };

  return (
    <div className="flex flex-col w-full h-full bg-white dark:bg-[#171718] text-slate-800 dark:text-zinc-200 overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {dragHandle}
          <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900 dark:text-white shrink-0">
            <Newspaper size={14} className="text-emerald-500 shrink-0" />
            <span className="hidden sm:inline">Tin tức</span>
          </div>

          {/* Tab Selector: Thị trường chung vs Mã cổ phiếu */}
          <div className="flex items-center gap-1 font-mono text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("market")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                activeTab === "market"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-700"
              }`}
              title="Xem tin tức thị trường tài chính & chứng khoán chung"
            >
              Thị trường chung
            </button>

            {isSpecificStock && (
              <button
                type="button"
                onClick={() => setActiveTab("symbol")}
                className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                  activeTab === "symbol"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-700"
                }`}
                title={`Xem tin tức liên quan trực tiếp hoặc ngành của mã ${symbol}`}
              >
                Mã {symbol}
              </button>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={fetchNews}
            disabled={isLoading}
            className="p-1 rounded bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 transition-colors cursor-pointer"
            title="Làm mới tin tức"
          >
            <RefreshCwIcon
              size={13}
              animateOnHover
              className={isLoading ? "animate-spin text-emerald-500" : ""}
            />
          </button>

          {(onToggleMaximize || onCloseModule) && (
            <div className="flex items-center gap-1 ml-1 pl-1 border-l border-slate-300 dark:border-zinc-700">
              {onToggleMaximize && (
                <button
                  type="button"
                  onClick={onToggleMaximize}
                  className="p-1 rounded bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 transition-colors cursor-pointer"
                  title={isMaximized ? "Thu nhỏ lại" : "Phóng to toàn màn hình"}
                >
                  {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                </button>
              )}

              {onCloseModule && (
                <button
                  type="button"
                  onClick={onCloseModule}
                  className="p-1 rounded bg-slate-100 dark:bg-zinc-800 hover:bg-rose-600 hover:border-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:border-rose-600 dark:hover:text-white text-slate-400 border border-slate-200 dark:border-zinc-700 transition-colors cursor-pointer"
                  title="Đóng module Tin tức"
                >
                  <XIcon size={13} animateOnHover />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* News Feed List */}
      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-slate-100 dark:divide-zinc-800 p-2 sm:p-3 space-y-2">
        {isLoading && news.length === 0 ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 animate-pulse space-y-2"
              >
                <div className="flex items-center gap-2">
                  <div className="h-4 w-16 bg-slate-200 dark:bg-zinc-800 rounded" />
                  <div className="h-3 w-20 bg-slate-200 dark:bg-zinc-800 rounded" />
                </div>
                <div className="h-4 w-5/6 bg-slate-200 dark:bg-zinc-800 rounded" />
                <div className="h-3 w-4/6 bg-slate-200 dark:bg-zinc-800 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-4">
            <p className="text-xs text-rose-500 mb-2">{error}</p>
            <button
              type="button"
              onClick={fetchNews}
              className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        ) : news.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-4 text-slate-500 dark:text-zinc-400 font-sans text-xs space-y-2">
            <Newspaper size={24} className="text-slate-300 dark:text-zinc-600 mb-1" />
            {activeTab === "symbol" ? (
              <>
                <span className="font-semibold text-slate-800 dark:text-zinc-200">
                  Không có bài báo trực tiếp hoặc ngành về mã {symbol} trong 7 ngày gần đây
                </span>
                <span className="text-[11px] text-slate-400 dark:text-zinc-500 max-w-sm">
                  Hệ thống đã tự động loại bỏ các tin rác không liên quan.
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab("market")}
                  className="mt-2 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors cursor-pointer"
                >
                  Xem tin thị trường chung
                </button>
              </>
            ) : (
              <>
                <span className="font-semibold text-slate-800 dark:text-zinc-200">
                  Đang cập nhật tin tức thị trường...
                </span>
                <button
                  type="button"
                  onClick={fetchNews}
                  className="mt-2 px-3 py-1 rounded bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-xs transition-colors cursor-pointer"
                >
                  Làm mới
                </button>
              </>
            )}
          </div>
        ) : (
          news.map((item, index) => (
            <article
              key={`${item.url || item.title}-${index}`}
              className="pt-2 first:pt-0 group transition-all"
            >
              <div className="p-2.5 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all">
                {/* Meta header: Nguồn, Độ liên quan & Thời gian */}
                <div className="flex items-center justify-between text-[11px] mb-1.5 gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                    {/* Badge nguồn báo */}
                    <span
                      className={`inline-block px-1.5 py-0.2 rounded font-medium text-[10px] ${getSourceBadgeColor(
                        item.source
                      )}`}
                    >
                      {item.source}
                    </span>


                    {/* Thời gian */}
                    <span className="flex items-center gap-1 text-slate-400 dark:text-zinc-500 text-[10px] font-mono">
                      <Calendar size={10} />
                      {formatNewsDate(item.date)}
                    </span>
                  </div>

                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="invisible group-hover:visible text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 text-[10px] shrink-0 font-medium"
                      title="Mở bài viết gốc ở tab mới"
                    >
                      <span>Xem nguồn</span>
                      <ExternalLink size={10} />
                    </a>
                  )}
                </div>

                {/* Tiêu đề tin tức */}
                <h3 className="text-xs sm:text-[13px] font-semibold text-slate-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 leading-snug transition-colors mb-1">
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {item.title}
                    </a>
                  ) : (
                    item.title
                  )}
                </h3>

                {/* Tóm tắt nội dung */}
                {item.summary && (
                  <p className="text-[11px] text-slate-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {item.summary}
                  </p>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
