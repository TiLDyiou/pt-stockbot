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
  SearchIcon,
  CheckIcon,
} from "lucide-animated";
import { RefreshCw, Loader2 } from "lucide-react";

interface WatchlistWidgetProps {
  onSelectSymbol?: (symbol: string) => void;
  onCloseModule?: () => void;
  dragHandle?: React.ReactNode;
}

interface SearchResultItem {
  symbol: string;
  name: string;
  exchange: string;
  price?: number;
  changePct?: number;
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
  onRefreshRec,
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
  onRefreshRec: (sym: string) => void;
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
      className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-zinc-800 border-b border-slate-100 dark:border-zinc-800 transition-colors text-xs cursor-pointer group last:border-b-0"
      onClick={() => onSelect(symbol)}
    >
      {/* Drag handle, Symbol & AI Recommendation Pill */}
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-[140px] sm:min-w-[155px]">
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-zinc-600 hover:text-slate-600 dark:hover:text-zinc-300 p-0.5 transition-colors shrink-0"
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
          className="flex items-center cursor-grab active:cursor-grabbing mr-1"
          title={`Kéo mã ${symbol} vào biểu đồ hoặc khung chat`}
        >
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
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border transition-transform hover:scale-105 cursor-help select-none shrink-0 ${
              recommendation.action === "Mua"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : recommendation.action === "Không mua"
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
            }`}
          >
            <span>{recommendation.action}</span>
          </div>
        ) : null}

        {/* Manual Refresh / Request Recommendation Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRefreshRec(symbol);
          }}
          disabled={isFetchingRec}
          className={`p-1 rounded transition-colors shrink-0 disabled:opacity-50 ${
            recommendation
              ? "text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800"
              : "text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700 text-[10px] px-1.5 py-0.5 flex items-center gap-1 font-mono cursor-pointer"
          }`}
          title={recommendation ? "Cập nhật khuyến cáo" : "Lấy khuyến cáo AI"}
        >
          <RefreshCw
            size={11}
            className={isFetchingRec ? "animate-spin text-emerald-500" : ""}
          />
          {!recommendation && (
            <span>{isFetchingRec ? "AI..." : "Khuyến cáo"}</span>
          )}
        </button>
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
          className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 dark:text-zinc-500 hover:text-white hover:bg-rose-600 dark:hover:bg-rose-600 transition-colors invisible group-hover:visible cursor-pointer"
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
  const [fetchingRecSymbols, setFetchingRecSymbols] = useState<Record<string, boolean>>({});
  const [hoveredRec, setHoveredRec] = useState<{
    symbol: string;
    rec: TickerRecommendation;
    rect: DOMRect;
  } | null>(null);
  const [newTicker, setNewTicker] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const handleRefreshRec = useCallback(async (sym: string) => {
    setFetchingRecSymbols((prev) => ({ ...prev, [sym]: true }));
    try {
      const res = await fetch("/api/watchlist/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols: [sym] }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.recommendations && json.recommendations[sym]) {
          const newRec = json.recommendations[sym];
          setRecommendations((prev) => {
            const merged = { ...prev, [sym]: newRec };
            saveWatchlistRecommendations(merged);
            return merged;
          });
          setHoveredRec((prev) =>
            prev?.symbol === sym ? { ...prev, rec: newRec } : prev
          );
        }
      }
    } catch (err) {
      console.error(`Lỗi cập nhật khuyến cáo ${sym}:`, err);
    } finally {
      setFetchingRecSymbols((prev) => ({ ...prev, [sym]: false }));
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

  // Tự động đóng gợi ý tìm kiếm khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSuggestionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Tra cứu gợi ý mã cổ phiếu theo từ khóa (debounced 200ms)
  useEffect(() => {
    const trimmed = newTicker.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsLoadingSearch(false);
      return;
    }

    let isSubscribed = true;
    setIsLoadingSearch(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        if (res.ok && isSubscribed) {
          const data = await res.json();
          setSearchResults(data.results || []);
          setSelectedSuggestionIndex(0);
        }
      } catch (err) {
        if (isSubscribed) {
          console.error("Lỗi tra cứu gợi ý mã:", err);
        }
      } finally {
        if (isSubscribed) {
          setIsLoadingSearch(false);
        }
      }
    }, 200);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [newTicker]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tickers.indexOf(String(active.id));
    const newIndex = tickers.indexOf(String(over.id));
    const updated = arrayMove(tickers, oldIndex, newIndex);

    setTickers(updated);
    saveWatchlist(updated);
  };

  const handleAddSymbol = (
    symbolToAdd: string,
    quoteData?: { price?: number; changePct?: number }
  ) => {
    const sym = symbolToAdd.trim().toUpperCase();
    if (!sym || sym.length < 3 || sym.length > 10) return;
    if (tickers.includes(sym)) {
      setNewTicker("");
      setIsSuggestionsOpen(false);
      return;
    }
    if (tickers.length >= 20) {
      alert("Watchlist tối đa 20 mã");
      return;
    }

    if (quoteData?.price !== undefined) {
      setQuotes((prev) => ({
        ...prev,
        [sym]: {
          symbol: sym,
          price: quoteData.price!,
          changePct: quoteData.changePct || 0,
        },
      }));
    }

    const updated = [...tickers, sym];
    setTickers(updated);
    saveWatchlist(updated);
    setNewTicker("");
    setSearchResults([]);
    setIsSuggestionsOpen(false);
  };

  const handleAddTicker = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      isSuggestionsOpen &&
      searchResults.length > 0 &&
      searchResults[selectedSuggestionIndex]
    ) {
      const item = searchResults[selectedSuggestionIndex];
      handleAddSymbol(item.symbol, {
        price: item.price,
        changePct: item.changePct,
      });
      return;
    }
    handleAddSymbol(newTicker);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSuggestionsOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      if (newTicker.trim().length > 0) {
        setIsSuggestionsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) =>
        searchResults.length > 0 ? (prev + 1) % searchResults.length : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) =>
        searchResults.length > 0
          ? (prev - 1 + searchResults.length) % searchResults.length
          : 0
      );
    } else if (e.key === "Escape") {
      setIsSuggestionsOpen(false);
    }
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
    <div className="flex flex-col w-full h-full bg-white dark:bg-[#171718] relative">
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

        {/* Right Actions: Quick Add Form with Search Suggestions Table & Close Button */}
        <div className="flex items-center gap-2 ml-auto">
          <div ref={searchContainerRef} className="relative">
            <form
              onSubmit={handleAddTicker}
              className="flex items-center gap-1.5"
            >
              <div className="relative flex items-center">
                <SearchIcon
                  size={13}
                  className="absolute left-2.5 text-slate-400 dark:text-zinc-500 pointer-events-none"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="THÊM MÃ CỔ PHIẾU"
                  value={newTicker}
                  onChange={(e) => {
                    setNewTicker(e.target.value);
                    setIsSuggestionsOpen(true);
                  }}
                  onFocus={() => {
                    if (newTicker.trim().length > 0) {
                      setIsSuggestionsOpen(true);
                    }
                  }}
                  onKeyDown={handleSearchKeyDown}
                  className="pl-7 pr-7 py-1.5 text-xs uppercase bg-slate-100 dark:bg-zinc-800 border border-transparent focus:border-emerald-500/50 outline-none rounded-lg w-44 sm:w-56 font-mono text-slate-900 dark:text-white placeholder:text-[10px] sm:placeholder:text-[11px] placeholder:font-mono placeholder:text-slate-400 shrink-0 transition-colors"
                />
                {newTicker && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewTicker("");
                      setSearchResults([]);
                      setIsSuggestionsOpen(false);
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
                    title="Xóa tìm kiếm"
                  >
                    <XIcon size={12} />
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={!newTicker.trim() || tickers.length >= 20}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs disabled:opacity-40 transition-colors shadow-xs cursor-pointer shrink-0"
                title="Thêm vào danh mục theo dõi"
              >
                <PlusIcon size={12} animateOnHover />
              </button>
            </form>

            {/* Bảng gợi ý tìm kiếm (Search suggestions dropdown table) */}
            {isSuggestionsOpen && newTicker.trim().length > 0 && (
              <div className="absolute right-0 top-full mt-1.5 w-80 sm:w-[440px] max-w-[calc(100vw-2rem)] bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-700/80 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in duration-100">
                {/* Header bar */}
                <div className="px-3 py-1.5 bg-slate-50 dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between text-[10px] font-mono text-slate-400 dark:text-zinc-500">
                  <span className="font-semibold text-slate-600 dark:text-zinc-300">
                    BẢNG GỢI Ý MÃ CỔ PHIẾU
                  </span>
                  <span className="text-[9px] hidden sm:inline text-slate-400">
                    ↑↓ chọn • ↵ thêm
                  </span>
                </div>

                {isLoadingSearch && searchResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 dark:text-zinc-500 font-mono flex items-center justify-center gap-2">
                    <Loader2 size={13} className="animate-spin text-emerald-500" />
                    <span>Đang tìm kiếm mã...</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 dark:text-zinc-400">
                    Không tìm thấy mã phù hợp cho &quot;{newTicker}&quot;.
                    {newTicker.trim().length >= 3 && (
                      <div className="mt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                        Bấm Enter hoặc nút + để thêm trực tiếp mã &quot;{newTicker.trim().toUpperCase()}&quot;
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="max-h-64 sm:max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100/80 dark:bg-zinc-800/80 text-[10px] font-mono text-slate-500 dark:text-zinc-400 border-b border-slate-200/60 dark:border-zinc-700/60 sticky top-0 z-10 backdrop-blur-xs">
                        <tr>
                          <th className="py-1.5 pl-3 pr-2 font-medium">Mã</th>
                          <th className="py-1.5 px-2 font-medium">Tên doanh nghiệp</th>
                          <th className="py-1.5 px-2 text-right font-medium">Giá</th>
                          <th className="py-1.5 px-2 text-right font-medium">+/-</th>
                          <th className="py-1.5 pl-2 pr-3 text-center font-medium w-16">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                        {searchResults.map((item, idx) => {
                          const isSelected = idx === selectedSuggestionIndex;
                          const isAdded = tickers.includes(item.symbol);
                          const isPositive = (item.changePct || 0) > 0;
                          const isNegative = (item.changePct || 0) < 0;

                          return (
                            <tr
                              key={item.symbol}
                              onClick={() => {
                                if (!isAdded) {
                                  handleAddSymbol(item.symbol, {
                                    price: item.price,
                                    changePct: item.changePct,
                                  });
                                }
                              }}
                              className={`cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-emerald-500/10 dark:bg-emerald-500/15"
                                  : "hover:bg-slate-50 dark:hover:bg-zinc-800/50"
                              } ${isAdded ? "opacity-60" : ""}`}
                            >
                              {/* Mã & Sàn */}
                              <td className="py-2 pl-3 pr-2 whitespace-nowrap">
                                <div className="flex items-center gap-1.5 font-mono">
                                  <span className="font-bold text-slate-900 dark:text-white text-xs tracking-wider">
                                    {item.symbol}
                                  </span>
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200/50 dark:border-zinc-700/50">
                                    {item.exchange}
                                  </span>
                                </div>
                              </td>

                              {/* Tên công ty */}
                              <td className="py-2 px-2 max-w-[130px] sm:max-w-[170px]">
                                <div
                                  className="text-[11px] text-slate-600 dark:text-zinc-300 truncate"
                                  title={item.name}
                                >
                                  {item.name}
                                </div>
                              </td>

                              {/* Giá */}
                              <td className="py-2 px-2 text-right font-mono text-[11px] font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                                {item.price !== undefined ? formatPrice(item.price) : "—"}
                              </td>

                              {/* +/- (%) */}
                              <td className="py-2 px-2 text-right font-mono text-[10px] font-bold whitespace-nowrap">
                                {item.changePct !== undefined ? (
                                  <span
                                    className={`inline-flex items-center gap-0.5 ${
                                      isPositive
                                        ? "text-emerald-500"
                                        : isNegative
                                        ? "text-rose-500"
                                        : "text-amber-500"
                                    }`}
                                  >
                                    {isPositive && <TrendingUpIcon size={10} />}
                                    {isNegative && <TrendingDownIcon size={10} />}
                                    <span>{formatPercent(item.changePct)}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>

                              {/* Thao tác */}
                              <td className="py-2 pl-2 pr-3 text-center whitespace-nowrap">
                                {isAdded ? (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                                    <CheckIcon size={11} className="text-emerald-500" />
                                    <span className="hidden sm:inline">Đã thêm</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={tickers.length >= 20}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddSymbol(item.symbol, {
                                        price: item.price,
                                        changePct: item.changePct,
                                      });
                                    }}
                                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-medium text-[10px] transition-colors shadow-xs cursor-pointer"
                                    title={
                                      tickers.length >= 20
                                        ? "Watchlist tối đa 20 mã"
                                        : `Thêm ${item.symbol} vào danh mục`
                                    }
                                  >
                                    <PlusIcon size={10} />
                                    <span>Thêm</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Footer status / help */}
                {tickers.length >= 20 && (
                  <div className="px-3 py-1.5 bg-rose-500/10 border-t border-rose-500/20 text-rose-500 text-[10px] font-mono text-center">
                    Danh mục đã đầy (20/20 mã). Vui lòng xóa bớt mã để thêm mới.
                  </div>
                )}
              </div>
            )}
          </div>

          {onCloseModule && (
            <button
              type="button"
              onClick={onCloseModule}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-rose-600 hover:border-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:border-rose-600 dark:hover:text-white text-slate-400 border border-slate-200 dark:border-zinc-700 transition-colors cursor-pointer shrink-0"
              title="Đóng module Danh mục theo dõi"
            >
              <XIcon size={14} animateOnHover />
            </button>
          )}
        </div>
      </div>

      {/* Table Column Labels */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800 text-[10px] font-mono text-slate-400 uppercase tracking-wider shrink-0">
        <span className="min-w-[140px] sm:min-w-[155px]">Mã & Khuyến cáo</span>
        <span className="hidden sm:inline">Xu hướng 30N</span>
        <div className="flex items-center gap-3">
          <span>Giá & Biến động</span>
          <span className="w-6" />
        </div>
      </div>

      {/* Tickers list */}
      <div className="divide-y divide-slate-100 dark:divide-zinc-800 flex-1 min-h-0 overflow-y-auto">
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
                  isFetchingRec={Boolean(fetchingRecSymbols[sym])}
                  onSelect={(s) => onSelectSymbol && onSelectSymbol(s)}
                  onRemove={handleRemoveTicker}
                  onHoverRec={(s, rec, rect) => setHoveredRec({ symbol: s, rec, rect })}
                  onLeaveRec={() => setHoveredRec(null)}
                  onRefreshRec={handleRefreshRec}
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
              typeof window !== "undefined" &&
              window.innerHeight - hoveredRec.rect.bottom < 190 &&
              hoveredRec.rect.top > 200
                ? undefined
                : Math.max(8, hoveredRec.rect.bottom + 8),
            bottom:
              typeof window !== "undefined" &&
              window.innerHeight - hoveredRec.rect.bottom < 190 &&
              hoveredRec.rect.top > 200
                ? window.innerHeight - hoveredRec.rect.top + 8
                : undefined,
            left: Math.max(
              12,
              Math.min(
                hoveredRec.rect.left,
                typeof window !== "undefined" ? window.innerWidth - 300 : 300
              )
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
          </div>

          {/* Rationale */}
          <div className="text-[11px] leading-relaxed text-slate-300 dark:text-zinc-300">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-zinc-500 mb-1 font-mono">
              Phân tích:
            </div>
            <p className="whitespace-normal leading-normal">
              {hoveredRec.rec.rationale}
            </p>
          </div>

          {/* Footer Timestamp */}
          {hoveredRec.rec.updatedAt && (
            <div className="mt-2.5 pt-1.5 border-t border-slate-800/60 dark:border-zinc-800/60 flex items-center justify-end text-[10px] text-slate-400 font-mono">
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
