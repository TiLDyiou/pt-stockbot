"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { loadWatchlist, saveWatchlist } from "@/lib/storage/layout-storage";
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
  onSelect,
  onRemove,
}: {
  symbol: string;
  quote?: TickerQuote;
  sparkline?: { date: string; close: number }[];
  onSelect: (sym: string) => void;
  onRemove: (sym: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: symbol });

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
      {/* Drag handle & Symbol Monogram */}
      <div className="flex items-center gap-2.5 min-w-[120px]">
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-zinc-600 hover:text-slate-600 dark:hover:text-zinc-300 p-0.5 transition-colors"
          title="Kéo thả sắp xếp thứ tự"
        >
          <GripVerticalIcon size={14} animateOnHover />
        </button>
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

      {/* Sparkline (30 days) */}
      <div className="hidden sm:flex items-center justify-center px-2" title="Xu hướng giá 30 phiên gần nhất">
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

export function WatchlistWidget({ onSelectSymbol, onCloseModule }: WatchlistWidgetProps) {
  const [tickers, setTickers] = useState<string[]>([]);
  const [quotes, setQuotes] = useState<Record<string, TickerQuote>>({});
  const [sparklines, setSparklines] = useState<Record<string, { date: string; close: number }[]>>({});
  const [newTicker, setNewTicker] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const list = loadWatchlist();
    setTickers(list);
    setIsMounted(true);
  }, []);

  const fetchWatchlistData = useCallback(async (currentTickers: string[]) => {
    if (currentTickers.length === 0) return;

    try {
      const res = await fetch(`/api/sparkline?symbols=${currentTickers.join(",")}`);
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
    <div className="flex flex-col w-full h-full bg-white dark:bg-[#171718] overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-slate-100 dark:border-zinc-800/60">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <BookmarkIcon size={16} className="text-emerald-500" animateOnHover />
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
          <form onSubmit={handleAddTicker} className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="+ Thêm mã (VD: SSI)"
              value={newTicker}
              onChange={(e) => setNewTicker(e.target.value)}
              className="px-3 py-1.5 text-xs uppercase bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-lg w-28 sm:w-32 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              disabled={!newTicker.trim()}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs disabled:opacity-40 transition-colors shadow-xs cursor-pointer shrink-0"
            >
              <PlusIcon size={12} animateOnHover />
              <span>Thêm</span>
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
        <span className="min-w-[120px]">Mã cổ phiếu</span>
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
            <SortableContext items={tickers} strategy={verticalListSortingStrategy}>
              {tickers.map((sym) => (
                <SortableItem
                  key={sym}
                  symbol={sym}
                  quote={quotes[sym]}
                  sparkline={sparklines[sym]}
                  onSelect={(s) => onSelectSymbol && onSelectSymbol(s)}
                  onRemove={handleRemoveTicker}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
