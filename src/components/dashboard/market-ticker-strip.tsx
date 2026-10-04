"use client";

import React, { useEffect, useState } from "react";
import { formatPrice, formatPercent } from "@/lib/utils/format";
import { TrendingUpIcon, TrendingDownIcon } from "lucide-animated";

interface TickerItem {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
}

const DEFAULT_STRIP_TICKERS: TickerItem[] = [
  { symbol: "VNINDEX", name: "VN-Index", price: 1737.71, changePct: -0.66 },
  { symbol: "VN30", name: "VN30", price: 1820.45, changePct: 0.35 },
  { symbol: "HNX", name: "HNX-Index", price: 245.12, changePct: -0.15 },
  { symbol: "FPT", name: "FPT Corp", price: 138500, changePct: 2.17 },
  { symbol: "VCB", name: "Vietcombank", price: 92400, changePct: 0.95 },
  { symbol: "HPG", name: "Hòa Phát", price: 28150, changePct: -1.22 },
  { symbol: "TCB", name: "Techcombank", price: 24350, changePct: 1.45 },
  { symbol: "MWG", name: "Thế Giới Di Động", price: 65200, changePct: 0.8 },
  { symbol: "SSI", name: "Chứng khoán SSI", price: 34100, changePct: 1.15 },
  { symbol: "VNM", name: "Vinamilk", price: 68500, changePct: -0.45 },
  { symbol: "MBB", name: "MBBank", price: 25400, changePct: 0.6 },
];

interface MarketTickerStripProps {
  activeSymbol?: string;
  onSelectSymbol: (symbol: string) => void;
}

export function MarketTickerStrip({
  onSelectSymbol,
}: MarketTickerStripProps) {
  const [items, setItems] = useState<TickerItem[]>(DEFAULT_STRIP_TICKERS);

  useEffect(() => {
    // Fetch quotes for the main symbols
    const fetchStripData = async () => {
      try {
        const symbols = [
          "VNINDEX",
          "VN30",
          "HNX",
          "FPT",
          "VCB",
          "HPG",
          "TCB",
          "MWG",
          "SSI",
          "VNM",
          "MBB",
        ];
        const promises = symbols.map(async (sym) => {
          try {
            const res = await fetch(`/api/quote?symbol=${sym}`);
            if (res.ok) {
              const data = await res.json();
              return {
                symbol: sym,
                name:
                  sym === "VNINDEX"
                    ? "VN-Index"
                    : sym === "VN30"
                    ? "VN30"
                    : sym === "HNX"
                    ? "HNX-Index"
                    : sym,
                price: data.price,
                changePct: data.changePct,
              };
            }
          } catch {
            // fallback
          }
          return null;
        });

        const results = await Promise.all(promises);
        const valid = results.filter(Boolean) as TickerItem[];
        if (valid.length > 0) {
          setItems((prev) =>
            prev.map((item) => {
              const found = valid.find((v) => v.symbol === item.symbol);
              return found || item;
            })
          );
        }
      } catch {
        // use default strip
      }
    };

    fetchStripData();
  }, []);

  return (
    <div className="w-full overflow-hidden">
      <div className="scroller">
        <div className="scroller__inner flex animate-marquee py-0.5">
          {[...items, ...items].map((item, idx) => {
            const isPositive = item.changePct > 0;
            const isNegative = item.changePct < 0;

            return (
              <button
                key={`${item.symbol}-${idx}`}
                type="button"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", item.symbol);
                  e.dataTransfer.setData("application/x-stock-ticker", item.symbol);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => onSelectSymbol(item.symbol)}
                className="flex shrink-0 items-center gap-2.5 border-r border-slate-200 dark:border-zinc-800 py-0.5 px-3.5 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors select-none text-left cursor-grab active:cursor-grabbing font-mono"
                title={`Kéo ${item.symbol} vào khung Chat để AI phân tích (hoặc nhấp để xem biểu đồ)`}
              >
                <span className="font-bold text-xs tracking-wider text-slate-900 dark:text-zinc-100">
                  {item.symbol}
                </span>

                <span className="font-medium text-slate-600 dark:text-zinc-400 text-xs">
                  {formatPrice(item.price)}
                </span>

                <span
                  className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${
                    isPositive
                      ? "text-emerald-500 dark:text-emerald-400"
                      : isNegative
                      ? "text-rose-500 dark:text-rose-400"
                      : "text-amber-500 dark:text-amber-400"
                  }`}
                >
                  {isPositive && <TrendingUpIcon size={11} animateOnHover />}
                  {isNegative && <TrendingDownIcon size={11} animateOnHover />}
                  <span>{formatPercent(item.changePct)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
