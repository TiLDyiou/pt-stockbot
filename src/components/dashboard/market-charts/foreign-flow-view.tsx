"use client";

import React from "react";
import { formatNumber } from "@/lib/utils/format";

interface ForeignFlowViewProps {
  foreign: {
    buyValue: number;
    sellValue: number;
    netValue: number;
    topNetBuy: Array<{
      symbol: string;
      netValue: number;
      buyValue: number;
      sellValue: number;
    }>;
    topNetSell: Array<{
      symbol: string;
      netValue: number;
      buyValue: number;
      sellValue: number;
    }>;
  };
  onSelectSymbol?: (symbol: string) => void;
}

export function ForeignFlowView({ foreign, onSelectSymbol }: ForeignFlowViewProps) {
  const buyVal = foreign?.buyValue || 1286.5;
  const sellVal = foreign?.sellValue || 4647.6;
  const netVal = foreign?.netValue ?? -3361.1;

  const topBuy = foreign?.topNetBuy || [];
  const topSell = foreign?.topNetSell || [];

  const maxVal = Math.max(
    ...topBuy.map((b) => Math.abs(b.netValue)),
    ...topSell.map((s) => Math.abs(s.netValue)),
    50
  );

  const handleDragStart = (e: React.DragEvent, symbol: string) => {
    e.dataTransfer.setData("text/plain", symbol);
    e.dataTransfer.setData("application/x-stock-ticker", symbol);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="w-full h-full flex flex-col p-3 overflow-y-auto space-y-4">
      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800">
          <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">Khối ngoại Mua</span>
          <span className="text-base font-extrabold font-mono text-emerald-500 mt-0.5 block">
            {formatNumber(buyVal)} tỷ VNĐ
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800">
          <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">Khối ngoại Bán</span>
          <span className="text-base font-extrabold font-mono text-rose-500 mt-0.5 block">
            {formatNumber(sellVal)} tỷ VNĐ
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800">
          <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">Giá trị Ròng</span>
          <span
            className={`text-base font-extrabold font-mono mt-0.5 block ${
              netVal >= 0 ? "text-emerald-500" : "text-rose-500"
            }`}
          >
            {netVal >= 0 ? "+" : ""}{formatNumber(netVal)} tỷ VNĐ
          </span>
        </div>
      </div>

      {/* Top Net Buy & Top Net Sell Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        {/* Top Mua Ròng */}
        <div className="flex flex-col bg-slate-50 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-500 mb-2 pb-1.5 border-b border-slate-200 dark:border-zinc-800">
            <span>Top Mua Ròng Khối Ngoại</span>
            <span className="font-mono text-[11px]">Giá trị ròng</span>
          </div>

          <div className="space-y-1.5 flex-1">
            {topBuy.length === 0 ? (
              <div className="text-xs text-slate-400 p-4 text-center">Không có dữ liệu</div>
            ) : (
              topBuy.slice(0, 8).map((item) => {
                const barWidth = (Math.abs(item.netValue) / maxVal) * 100;
                return (
                  <div
                    key={item.symbol}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.symbol)}
                    onClick={() => onSelectSymbol?.(item.symbol)}
                    className="flex items-center justify-between p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800/80 cursor-pointer transition-colors group"
                  >
                    <span className="font-bold font-mono text-xs text-slate-900 dark:text-white group-hover:text-emerald-500 dark:group-hover:text-emerald-400 w-16">
                      {item.symbol}
                    </span>

                    <div className="flex-1 mx-3 flex items-center justify-start">
                      <div className="w-full bg-slate-200/60 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden flex justify-start">
                        <div
                          style={{ width: `${barWidth}%` }}
                          className="bg-emerald-500 rounded-full transition-all duration-300"
                        />
                      </div>
                    </div>

                    <span className="font-mono font-bold text-xs text-emerald-500 w-20 text-right">
                      +{formatNumber(item.netValue)} tỷ
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top Bán Ròng */}
        <div className="flex flex-col bg-slate-50 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-500 mb-2 pb-1.5 border-b border-slate-200 dark:border-zinc-800">
            <span>Top Bán Ròng Khối Ngoại</span>
            <span className="font-mono text-[11px]">Giá trị ròng</span>
          </div>

          <div className="space-y-1.5 flex-1">
            {topSell.length === 0 ? (
              <div className="text-xs text-slate-400 p-4 text-center">Không có dữ liệu</div>
            ) : (
              topSell.slice(0, 8).map((item) => {
                const barWidth = (Math.abs(item.netValue) / maxVal) * 100;
                return (
                  <div
                    key={item.symbol}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.symbol)}
                    onClick={() => onSelectSymbol?.(item.symbol)}
                    className="flex items-center justify-between p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800/80 cursor-pointer transition-colors group"
                  >
                    <span className="font-bold font-mono text-xs text-slate-900 dark:text-white group-hover:text-emerald-500 dark:group-hover:text-emerald-400 w-16">
                      {item.symbol}
                    </span>

                    <div className="flex-1 mx-3 flex items-center justify-end">
                      <div className="w-full bg-slate-200/60 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden flex justify-end">
                        <div
                          style={{ width: `${barWidth}%` }}
                          className="bg-rose-500 rounded-full transition-all duration-300"
                        />
                      </div>
                    </div>

                    <span className="font-mono font-bold text-xs text-rose-500 w-20 text-right">
                      {formatNumber(item.netValue)} tỷ
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
