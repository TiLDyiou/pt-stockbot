"use client";

import React from "react";
import { formatNumber, formatPercent } from "@/lib/utils/format";

interface LiquidityCompareViewProps {
  liquidity: {
    value: number;
    valuePrevious: number;
    changePercent: number;
    volume: number;
    unit: string;
  };
}

export function LiquidityCompareView({ liquidity }: LiquidityCompareViewProps) {
  const currentVal = liquidity?.value || 19176.088;
  const prevVal = liquidity?.valuePrevious || 15354.221;
  const changePct = liquidity?.changePercent ?? 24.891;
  const volume = liquidity?.volume || 829387968;

  const maxVal = Math.max(currentVal, prevVal) * 1.15;
  const currentBarPct = (currentVal / maxVal) * 100;
  const prevBarPct = (prevVal / maxVal) * 100;

  return (
    <div className="w-full h-full flex flex-col p-4 overflow-y-auto space-y-4">
      <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200 tracking-wide text-center">
        So sánh thanh khoản thị trường (Giá trị khớp lệnh)
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800">
          <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">Hôm nay</span>
          <span className="text-lg font-black font-mono text-emerald-500 mt-0.5 block">
            {formatNumber(currentVal)} tỷ VNĐ
          </span>
          <span className="text-[10px] text-slate-400 font-mono mt-1 block">
            KLGD: {formatNumber(volume)} CP
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800">
          <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">Phiên trước</span>
          <span className="text-lg font-black font-mono text-slate-700 dark:text-zinc-300 mt-0.5 block">
            {formatNumber(prevVal)} tỷ VNĐ
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800">
          <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">Biến động thanh khoản</span>
          <span
            className={`text-lg font-black font-mono mt-0.5 block ${
              changePct >= 0 ? "text-emerald-500" : "text-rose-500"
            }`}
          >
            {changePct >= 0 ? "+" : ""}{formatPercent(changePct)}
          </span>
          <span className="text-[10px] text-slate-400 font-mono mt-1 block">
            {changePct >= 0 ? "Tăng trưởng dòng tiền" : "Dòng tiền thu hẹp"}
          </span>
        </div>
      </div>

      {/* Comparative Horizontal Bars */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800 space-y-4">
        <div>
          <div className="flex items-center justify-between text-xs font-mono mb-1.5">
            <span className="font-semibold text-slate-800 dark:text-zinc-200">Phiên hiện tại (Hôm nay)</span>
            <span className="font-bold text-emerald-500">{formatNumber(currentVal)} tỷ</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-zinc-800 h-4 rounded-full overflow-hidden">
            <div
              style={{ width: `${currentBarPct}%` }}
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs font-mono mb-1.5">
            <span className="font-semibold text-slate-600 dark:text-zinc-400">Phiên liền kề trước đó</span>
            <span className="font-bold text-slate-500">{formatNumber(prevVal)} tỷ</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-zinc-800 h-4 rounded-full overflow-hidden">
            <div
              style={{ width: `${prevBarPct}%` }}
              className="h-full bg-slate-400 dark:bg-zinc-600 rounded-full transition-all duration-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
