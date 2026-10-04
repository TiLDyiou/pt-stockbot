"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  loadWatchlist,
  saveWatchlist,
  loadWatchlistRecommendations,
  saveWatchlistRecommendations,
  type WatchlistRecommendations,
  type TickerRecommendation,
} from "@/lib/storage/layout-storage";
import { SparklineSvg } from "./sparkline-svg";
import { formatPrice, formatPercent } from "@/lib/utils/format";
import {
  GripVerticalIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  XIcon,
  BookmarkIcon,
  PlusIcon,
} from "lucide-animated";

interface WatchlistWidgetProps {
  onSelectSymbol?: (symbol: string) => void;
  onCloseModule?: () => void;
  dragHandle?: React.ReactNode;
}

interface TickerQuote {
  symbol: string;
  price: number;
  changePct: number;
}

function SortableItem({
  symbol,
  quote,
  sparkline,
  recommendation,
  isFetchingRec,
  onSelect,
  onRemove,
  onHoverRec,
  onLeaveRec,
}: {
  symbol: string;
  quote?: TickerQuote;
  sparkline?: { date: string; close: number }[];
  recommendation?: TickerRecommendation;
  isFetchingRec?: boolean;
  onSelect: (sym: string) => void;
  onRemove: (sym: string) => void;
  onHoverRec: (sym: string, rec: TickerRecommendation, rect: DOMRect) => void;
  onLeaveRec: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: symbol });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const change = quote?.changePct || 0;
  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-zinc-800/40 border-b border-slate-100 dark:border-zinc-800/50 transition-colors text-xs cursor-pointer group last:border-b-0"
      onClick={() => onSelect(symbol)}
    >
      {/* Drag handle, Symbol Monogram, & AI Recommendation Pill */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-[130px]">
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-zinc-600 hover:text-slate-600 dark:hover:text-zinc-300 p-0.5 transition-colors"
          title="Kéo thả sắp xếp thứ tự"
        >
          <GripVerticalIcon size={14} animateOnHover />
        </button>
        <div
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.setData("application/x-stock-ticker", symbol);
            e.dataTransfer.setData("text/plain", symbol);
            e.dataTransfer.effectAllowed = "copy";
          }}
          className="flex items-center gap-2 cursor-grab active:cursor-grabbing"
          title={`Kéo mã ${symbol} vào biểu đồ hoặc khung chat`}
        >
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700/60 flex items-center justify-center font-mono font-bold text-xs text-slate-700 dark:text-zinc-200 shrink-0">
            {symbol.slice(0, 3)}
          </div>
          <div className="text-left font-mono">
            <span className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors block text-xs tracking-wider">
              {symbol}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500">
              HOSE
            </span>
          </div>
        </div>

        {/* AI Recommendation Pill (Hover to show tooltip) */}
        {recommendation ? (
          <div
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              onHoverRec(symbol, recommendation, rect);
            }}
            onMouseLeave={onLeaveRec}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border transition-transform hover:scale-105 cursor-help select-none shrink-0 ${
              recommendation.action === "Mua"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : recommendation.action === "Không mua"
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                recommendation.action === "Mua"
                  ? "bg-emerald-500"
                  : recommendation.action === "Không mua"
                  ? "bg-rose-500"
                  : "bg-amber-500"
              }`}
            />
            <span>{recommendation.action}</span>
          </div>
        ) : isFetchingRec ? (
          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-zinc-800/80 animate-pulse shrink-0">
            <span>AI...</span>
          </div>
        ) : null}
      </div>

      {/* Sparkline (30 days) */}
      <div
        className="hidden sm:flex items-center justify-center px-2"
        title="Xu hướng giá 30 phiên gần nhất"
      >
        <SparklineSvg data={sparkline || []} width={85} height={22} />
      </div>

      {/* Price, Change Pill, & Remove Action */}
      <div className="flex items-center gap-3">
        {quote ? (
          <div className="flex items-center gap-2 sm:gap-3 text-right font-mono">
            <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm min-w-[65px]">
              {formatPrice(quote.price)}
            </span>
            <span
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold min-w-[65px] justify-center ${
                isPositive
                  ? "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400"
                  : isNegative
                    ? "bg-rose-500/10 text-rose-500 dark:text-rose-400"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              }`}
            >
              {isPositive && <TrendingUpIcon size={11} animateOnHover />}
              {isNegative && <TrendingDownIcon size={11} animateOnHover />}
              <span>{formatPercent(quote.changePct)}</span>
            </span>
          </div>
        ) : (
          <div className="text-slate-400 text-[11px] font-mono animate-pulse min-w-[130px] text-right">
            Đang tải giá...
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(symbol);
          }}
          className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 dark:text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
          title="Xóa khỏi watchlist"
        >
          <XIcon size={12} animateOnHover />
        </button>
      </div>
    </div>
  );
}

export function WatchlistWidget({
  onSelectSymbol,
  onCloseModule,
  dragHandle,
}: WatchlistWidgetProps) {
  const [tickers, setTickers] = useState<string[]>([]);
  const [quotes, setQuotes] = useState<Record<string, TickerQuote>>({});
  const [sparklines, setSparklines] = useState<
    Record<string, { date: string; close: number }[]>
  >({});
  const [recommendations, setRecommendations] = useState<WatchlistRecommendations>({});
  const [isFetchingRecs, setIsFetchingRecs] = useState(false);
  const [hoveredRec, setHoveredRec] = useState<{
    symbol: string;
    rec: TickerRecommendation;
    rect: DOMRect;
  } | null>(null);
  const [newTicker, setNewTicker] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const backgroundFetchedRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    const list = loadWatchlist();
    setTickers(list);
    const savedRecs = loadWatchlistRecommendations();
    setRecommendations(savedRecs);
    setIsMounted(true);
  }, []);

  const refreshRecommendations = useCallback(async (currentTickers: string[]) => {
    if (currentTickers.length === 0) return;
    setIsFetchingRecs(true);
    try {
      const res = await fetch("/api/watchlist/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols: currentTickers }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.recommendations) {
          setRecommendations((prev) => {
            const merged = { ...prev, ...json.recommendations };
            saveWatchlistRecommendations(merged);
            return merged;
          });
        }
      }
    } catch (err) {
      console.error("Lỗi cập nhật khuyến cáo danh mục:", err);
    } finally {
      setIsFetchingRecs(false);
    }
  }, []);

  const fetchWatchlistData = useCallback(async (currentTickers: string[]) => {
    if (currentTickers.length === 0) return;

    try {
      const res = await fetch(
        `/api/sparkline?symbols=${currentTickers.join(",")}`,
      );
      if (res.ok) {
        const json = await res.json();
        setSparklines(json.sparklines || {});
      }
    } catch (err) {
      console.error("Lỗi tải sparklines:", err);
    }

    currentTickers.forEach(async (sym) => {
      try {
        const res = await fetch(`/api/quote?symbol=${sym}`);
        if (res.ok) {
          const q = await res.json();
          setQuotes((prev) => ({
            ...prev,
            [sym]: {
              symbol: sym,
              price: q.price,
              changePct: q.changePct,
            },
          }));
        }
      } catch (err) {
        console.error(`Lỗi tải giá ${sym}:`, err);
      }
    });
  }, []);

  useEffect(() => {
    if (isMounted && tickers.length > 0) {
      fetchWatchlistData(tickers);
    }
  }, [isMounted, tickers, fetchWatchlistData]);

  // Cập nhật khuyến cáo chạy nền sau mỗi lần mở web
  useEffect(() => {
    if (isMounted && tickers.length > 0 && !backgroundFetchedRef.current) {
      backgroundFetchedRef.current = true;
      refreshRecommendations(tickers);
    }
  }, [isMounted, tickers, refreshRecommendations]);

  // Tự động đóng tooltip khi cuộn trang hoặc đổi kích thước
  useEffect(() => {
    const handleDismissTooltip = () => setHoveredRec(null);
    window.addEventListener("scroll", handleDismissTooltip, true);
    window.addEventListener("resize", handleDismissTooltip);
    return () => {
      window.removeEventListener("scroll", handleDismissTooltip, true);
      window.removeEventListener("resize", handleDismissTooltip);
    };
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tickers.indexOf(String(active.id));
    const newIndex = tickers.indexOf(String(over.id));
    const updated = arrayMove(tickers, oldIndex, newIndex);

    setTickers(updated);
    saveWatchlist(updated);
  };

  const handleAddTicker = (e: React.FormEvent) => {
    e.preventDefault();
    const sym = newTicker.trim().toUpperCase();
    if (!sym || sym.length < 3 || sym.length > 10) return;
    if (tickers.includes(sym)) {
      setNewTicker("");
      return;
    }
    if (tickers.length >= 20) {
      alert("Watchlist tối đa 20 mã");
      return;
    }

    const updated = [...tickers, sym];
    setTickers(updated);
    saveWatchlist(updated);
    setNewTicker("");

    // Tải khuyến cáo chạy nền cho mã mới thêm
    refreshRecommendations([sym]);
  };

  const handleRemoveTicker = (sym: string) => {
    const updated = tickers.filter((t) => t !== sym);
    setTickers(updated);
    saveWatchlist(updated);
  };

  if (!isMounted) {
    return (
      <div className="p-6 text-center text-xs text-slate-400 font-mono">
        Đang tải danh mục theo dõi...
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full bg-white dark:bg-[#171718] overflow-hidden relative">
      {/* Card Header */}
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-slate-100 dark:border-zinc-800/60">
        <div
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.setData("application/x-dashboard-module", "watchlist");
            e.dataTransfer.setData("application/x-module-watchlist", "watchlist");
            e.dataTransfer.effectAllowed = "copyMove";
          }}
          className="flex items-center gap-2.5 shrink-0 cursor-grab active:cursor-grabbing"
          title="Kéo toàn bộ module Danh mục vào khung Chat để phân tích (hoặc hoán đổi vị trí)"
        >
          {dragHandle}
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <BookmarkIcon
              size={16}
              className="text-emerald-500"
              animateOnHover
            />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
              Danh mục theo dõi
            </h3>
            <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono">
              {tickers.length}/20 mã cổ phiếu
            </span>
          </div>
        </div>

        {/* Right Actions: Quick Add Form & Close Button */}
        <div className="flex items-center gap-2 ml-auto">
          <form
            onSubmit={handleAddTicker}
            className="flex items-center gap-1.5"
          >
            <input
              type="text"
              placeholder="+ THÊM MÃ CỔ PHIẾU"
              value={newTicker}
              onChange={(e) => setNewTicker(e.target.value)}
              className="px-3 py-1.5 text-xs uppercase bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-lg w-44 sm:w-52 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-slate-900 dark:text-white placeholder:text-[10px] sm:placeholder:text-[11px] placeholder:font-mono placeholder:text-slate-400 shrink-0"
            />
            <button
              type="submit"
              disabled={!newTicker.trim()}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs disabled:opacity-40 transition-colors shadow-xs cursor-pointer shrink-0"
            >
              <PlusIcon size={12} animateOnHover />
            </button>
          </form>

          {onCloseModule && (
            <button
              type="button"
              onClick={onCloseModule}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800/80 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 border border-slate-200 dark:border-zinc-700/80 transition-colors cursor-pointer shrink-0"
              title="Đóng module Danh mục theo dõi"
            >
              <XIcon size={14} animateOnHover />
            </button>
          )}
        </div>
      </div>

      {/* Table Column Labels */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50/60 dark:bg-zinc-900/40 border-b border-slate-100 dark:border-zinc-800/40 text-[10px] font-mono text-slate-400 uppercase tracking-wider shrink-0">
        <span className="min-w-[130px]">Mã & Khuyến cáo</span>
        <span className="hidden sm:inline">Xu hướng 30N</span>
        <div className="flex items-center gap-3">
          <span>Giá & Biến động</span>
          <span className="w-6" />
        </div>
      </div>

      {/* Tickers list */}
      <div className="divide-y divide-slate-100 dark:divide-zinc-800/40 flex-1 min-h-0 overflow-y-auto">
        {tickers.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-8">
            Danh mục theo dõi đang trống. Thêm mã vào ô trên.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={tickers}
              strategy={verticalListSortingStrategy}
            >
              {tickers.map((sym) => (
                <SortableItem
                  key={sym}
                  symbol={sym}
                  quote={quotes[sym]}
                  sparkline={sparklines[sym]}
                  recommendation={recommendations[sym]}
                  isFetchingRec={isFetchingRecs && !recommendations[sym]}
                  onSelect={(s) => onSelectSymbol && onSelectSymbol(s)}
                  onRemove={handleRemoveTicker}
                  onHoverRec={(s, rec, rect) => setHoveredRec({ symbol: s, rec, rect })}
                  onLeaveRec={() => setHoveredRec(null)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Floating AI Recommendation Tooltip */}
      {hoveredRec && (
        <div
          style={{
            position: "fixed",
            top:
              hoveredRec.rect.top > 180
                ? undefined
                : Math.max(8, hoveredRec.rect.bottom + 6),
            bottom:
              hoveredRec.rect.top > 180
                ? window.innerHeight - hoveredRec.rect.top + 6
                : undefined,
            left: Math.max(
              12,
              Math.min(hoveredRec.rect.left - 8, window.innerWidth - 300)
            ),
          }}
          className="z-50 w-72 p-3 rounded-xl bg-slate-900/95 dark:bg-[#18181b]/95 text-slate-100 border border-slate-700/80 dark:border-zinc-700/80 shadow-2xl backdrop-blur-md pointer-events-none animate-in fade-in zoom-in-95 duration-150 font-sans text-xs select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 dark:border-zinc-800 pb-2 mb-2">
            <div className="flex items-center gap-1.5 font-mono">
              <span className="font-bold text-sm text-white">
                {hoveredRec.symbol}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  hoveredRec.rec.action === "Mua"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : hoveredRec.rec.action === "Không mua"
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                    : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                }`}
              >
                {hoveredRec.rec.action === "Mua"
                  ? "NÊN MUA"
                  : hoveredRec.rec.action === "Không mua"
                  ? "KHÔNG MUA"
                  : "CẦN THEO DÕI"}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Khuyến cáo AI
            </span>
          </div>

          {/* Rationale */}
          <div className="text-[11px] leading-relaxed text-slate-300 dark:text-zinc-300">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-zinc-500 mb-1 font-mono">
              Lí do khuyến cáo:
            </div>
            <p className="whitespace-normal leading-normal">
              {hoveredRec.rec.rationale}
            </p>
          </div>

          {/* Footer Timestamp */}
          {hoveredRec.rec.updatedAt && (
            <div className="mt-2.5 pt-1.5 border-t border-slate-800/60 dark:border-zinc-800/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>Cập nhật:</span>
              <span>
                {new Date(hoveredRec.rec.updatedAt).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                {new Date(hoveredRec.rec.updatedAt).toLocaleDateString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                })}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
