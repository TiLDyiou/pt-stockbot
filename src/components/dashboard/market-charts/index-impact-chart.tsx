"use client";

import React from "react";
import { IndexMoverItem } from "@/lib/vnstock/market-data";
import { formatPercent } from "@/lib/utils/format";

interface IndexImpactChartProps {
  positive: IndexMoverItem[];
  negative: IndexMoverItem[];
  onSelectSymbol?: (symbol: string) => void;
}

export function IndexImpactChart({
  positive,
  negative,
  onSelectSymbol,
}: IndexImpactChartProps) {
  const maxAbsPoint = Math.max(
    ...positive.map((p) => Math.abs(p.point)),
    ...negative.map((n) => Math.abs(n.point)),
    2.0
  );

  const handleDragStart = (e: React.DragEvent, symbol: string) => {
    e.dataTransfer.setData("text/plain", symbol);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="w-full h-full flex flex-col p-3 overflow-y-auto">
      <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200 tracking-wide text-center mb-3">
        Mã tác động tới VN-Index (Điểm đóng góp)
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        {/* Top Kéo Giảm Điểm (Negative Contributors) */}
        <div className="flex flex-col bg-slate-50 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-500 mb-2 pb-1.5 border-b border-slate-200 dark:border-zinc-800">
            <span>Top kéo giảm điểm</span>
            <span className="font-mono text-[11px]">Đóng góp</span>
          </div>

          <div className="space-y-1.5 flex-1">
            {negative.map((item) => {
              const barWidthPct = (Math.abs(item.point) / maxAbsPoint) * 100;
              return (
                <div
                  key={item.symbol}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.symbol)}
                  onClick={() => onSelectSymbol?.(item.symbol)}
                  className="flex items-center justify-between p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800/80 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-2 w-20">
                    <span className="font-bold font-mono text-xs text-slate-900 dark:text-white group-hover:text-emerald-500 dark:group-hover:text-emerald-400">
                      {item.symbol}
                    </span>
                    <span className="text-[10px] font-mono text-rose-500">
                      {formatPercent(item.changePct)}
                    </span>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="flex-1 mx-3 flex items-center justify-end">
                    <div className="w-full bg-slate-200/60 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden flex justify-end">
                      <div
                        style={{ width: `${barWidthPct}%` }}
                        className="bg-rose-500 rounded-full transition-all duration-300"
                      />
                    </div>
                  </div>

                  <span className="font-mono font-bold text-xs text-rose-500 w-14 text-right">
                    {item.point.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Kéo Tăng Điểm (Positive Contributors) */}
        <div className="flex flex-col bg-slate-50 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-500 mb-2 pb-1.5 border-b border-slate-200 dark:border-zinc-800">
            <span>Top kéo tăng điểm</span>
            <span className="font-mono text-[11px]">Đóng góp</span>
          </div>

          <div className="space-y-1.5 flex-1">
            {positive.map((item) => {
              const barWidthPct = (Math.abs(item.point) / maxAbsPoint) * 100;
              return (
                <div
                  key={item.symbol}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.symbol)}
                  onClick={() => onSelectSymbol?.(item.symbol)}
                  className="flex items-center justify-between p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800/80 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-2 w-20">
                    <span className="font-bold font-mono text-xs text-slate-900 dark:text-white group-hover:text-emerald-500 dark:group-hover:text-emerald-400">
                      {item.symbol}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-500">
                      +{formatPercent(item.changePct)}
                    </span>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="flex-1 mx-3 flex items-center justify-start">
                    <div className="w-full bg-slate-200/60 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden flex justify-start">
                      <div
                        style={{ width: `${barWidthPct}%` }}
                        className="bg-emerald-500 rounded-full transition-all duration-300"
                      />
                    </div>
                  </div>

                  <span className="font-mono font-bold text-xs text-emerald-500 w-14 text-right">
                    +{item.point.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
