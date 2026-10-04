"use client";

import React, { useEffect, useState } from "react";
import { formatNumber } from "@/lib/utils/format";
import {
  EarthIcon,
  RefreshCwIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  TrendingUpDownIcon,
  XIcon,
} from "lucide-animated";

interface MarketOverviewWidgetProps {
  onCloseModule?: () => void;
}

export function MarketOverviewWidget({ onCloseModule }: MarketOverviewWidgetProps = {}) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/market");
      if (!res.ok) throw new Error("Không thể tải dữ liệu thị trường");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err?.message || "Lỗi tải thị trường");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  return (
    <div className="flex flex-col w-full h-full bg-white dark:bg-[#171718] overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-slate-100 dark:border-zinc-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center">
            <EarthIcon size={16} className="text-sky-500" animateOnHover />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
              Tổng quan thị trường
            </h3>
            <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono">
              Độ rộng, thanh khoản & khối ngoại
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={fetchOverview}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCwIcon size={13} className={isLoading ? "animate-spin" : ""} animateOnHover />
          </button>

          {onCloseModule && (
            <button
              onClick={onCloseModule}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 border border-slate-200 dark:border-zinc-700 transition-colors cursor-pointer"
              title="Đóng module Tổng quan thị trường"
            >
              <XIcon size={13} animateOnHover />
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="p-8 flex items-center justify-center text-slate-400 font-mono text-xs animate-pulse">
          Đang tải dữ liệu tổng quan thị trường...
        </div>
      )}

      {error && (
        <div className="p-6 flex flex-col items-center justify-center text-rose-500 text-center">
          <p className="text-xs mb-2">{error}</p>
          <button
            onClick={fetchOverview}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-zinc-800 rounded-lg text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-200"
          >
            <RefreshCwIcon size={12} animateOnHover />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {!isLoading && !error && data && (
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Breadth Bar & Counts */}
          {data.breadth && (
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Độ rộng thị trường
                </span>
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold">
                    <TrendingUpIcon size={11} animateOnHover />
                    <span>{data.breadth.advancing ?? data.breadth.advances ?? data.breadth.gainers ?? 0}</span>
                  </span>
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-bold">
                    <TrendingUpDownIcon size={11} animateOnHover />
                    <span>{data.breadth.unchanged ?? data.breadth.noChanges ?? 0}</span>
                  </span>
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 font-bold">
                    <TrendingDownIcon size={11} animateOnHover />
                    <span>{data.breadth.declining ?? data.breadth.declines ?? data.breadth.losers ?? 0}</span>
                  </span>
                </div>
              </div>

              {/* Segmented Meter Bar */}
              {(() => {
                const up = Number(data.breadth.advancing ?? data.breadth.advances ?? data.breadth.gainers ?? 0);
                const same = Number(data.breadth.unchanged ?? data.breadth.noChanges ?? 0);
                const down = Number(data.breadth.declining ?? data.breadth.declines ?? data.breadth.losers ?? 0);
                const total = Math.max(1, up + same + down);
                const upPct = (up / total) * 100;
                const samePct = (same / total) * 100;
                const downPct = (down / total) * 100;

                return (
                  <div className="h-2 w-full rounded-full overflow-hidden flex bg-slate-100 dark:bg-zinc-800">
                    <div style={{ width: `${upPct}%` }} className="bg-emerald-500 transition-all duration-500" />
                    <div style={{ width: `${samePct}%` }} className="bg-amber-400 transition-all duration-500" />
                    <div style={{ width: `${downPct}%` }} className="bg-rose-500 transition-all duration-500" />
                  </div>
                );
              })()}
            </div>
          )}

          {/* Stats Grid: Liquidity & Volume */}
          {data.liquidity && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800/60">
                <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">
                  Tổng thanh khoản
                </span>
                <span className="text-base font-extrabold font-mono text-slate-900 dark:text-white mt-0.5 block">
                  {formatNumber(data.liquidity.totalValue || data.liquidity.value)} tỷ VNĐ
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800/60">
                <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">
                  Tổng khối lượng
                </span>
                <span className="text-base font-extrabold font-mono text-slate-900 dark:text-white mt-0.5 block">
                  {formatNumber(data.liquidity.totalVolume || data.liquidity.volume)} CP
                </span>
              </div>
            </div>
          )}

          {/* Foreign Flow */}
          {data.foreign && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800/60 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">
                  Giao dịch khối ngoại
                </span>
                <span className="text-xs text-slate-600 dark:text-zinc-400 font-medium">
                  {data.foreign.netValue >= 0 ? "Mua ròng" : "Bán ròng"}
                </span>
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                  data.foreign.netValue >= 0
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-rose-500/10 text-rose-500"
                }`}
              >
                {data.foreign.netValue >= 0 ? "+" : ""}{formatNumber(data.foreign.netValue)} VNĐ
              </span>
            </div>
          )}

          {/* Timestamp */}
          <div className="text-[11px] font-mono text-slate-400 dark:text-zinc-500 text-right pt-2 border-t border-slate-100 dark:border-zinc-800/40">
            Cập nhật: {new Date(data.asOf || Date.now()).toLocaleTimeString("vi-VN")}
          </div>
        </div>
      )}
    </div>
  );
}
