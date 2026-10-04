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

interface WatchlistWidgetProps {
  onSelectSymbol?: (symbol: string) => void;
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

  const isUp = (quote?.changePct || 0) >= 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between px-2.5 py-2 rounded bg-slate-50 dark:bg-terminal-subtle/50 hover:bg-slate-100 dark:hover:bg-terminal-hover border border-slate-200/60 dark:border-terminal-border/80 transition-colors text-xs"
    >
      {/* Drag handle & Symbol */}
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-0.5"
          title="Kéo thả sắp xếp"
        >
          ⋮⋮
        </button>
        <button
          onClick={() => onSelect(symbol)}
          className="font-bold text-slate-900 dark:text-white hover:text-emerald-500 font-mono text-xs tracking-wider"
        >
          {symbol}
        </button>
      </div>

      {/* Sparkline */}
      <div
        className="hidden sm:block cursor-pointer"
        onClick={() => onSelect(symbol)}
        title="Xem biểu đồ chi tiết"
      >
        <SparklineSvg data={sparkline || []} width={70} height={18} />
      </div>

      {/* Price & Change */}
      <div className="flex items-center gap-3">
        {quote ? (
          <div className="text-right font-mono">
            <div className="font-semibold text-slate-900 dark:text-white">
              {formatPrice(quote.price)}
            </div>
            <div
              className={`text-[11px] font-medium ${
                isUp ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              {formatPercent(quote.changePct)}
            </div>
          </div>
        ) : (
          <div className="text-slate-400 text-[10px] font-mono animate-pulse">...</div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(symbol);
          }}
          className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 text-xs transition-colors"
          title="Xóa khỏi watchlist"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export function WatchlistWidget({ onSelectSymbol }: WatchlistWidgetProps) {
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
      <div className="p-4 text-center text-xs text-slate-400 font-mono">
        Đang tải danh mục theo dõi...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full select-none text-xs">
      {/* Header & Add form */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-terminal-border">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-xs tracking-wider uppercase text-slate-500">
            Theo dõi
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-terminal-subtle text-slate-400">
            {tickers.length}/20
          </span>
        </div>

        <form onSubmit={handleAddTicker} className="flex items-center gap-1">
          <input
            type="text"
            placeholder="Mã (VD: SSI)"
            value={newTicker}
            onChange={(e) => setNewTicker(e.target.value)}
            className="px-2 py-0.5 text-xs uppercase bg-slate-50 dark:bg-terminal-subtle border border-slate-200 dark:border-slate-700 rounded w-24 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
          />
          <button
            type="submit"
            disabled={!newTicker.trim()}
            className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs disabled:opacity-40 transition-colors"
          >
            +
          </button>
        </form>
      </div>

      {/* Tickers list */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 max-h-[340px]">
        {tickers.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-6">
            Danh mục đang trống. Thêm mã vào ô trên.
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
