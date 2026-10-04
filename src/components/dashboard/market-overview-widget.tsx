"use client";

import React, { useEffect, useState } from "react";
import { formatNumber } from "@/lib/utils/format";

export function MarketOverviewWidget() {
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
    <div className="flex flex-col h-full select-none text-xs">
      <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-black/[0.04] dark:border-white/[0.06]">
        <span className="font-semibold uppercase tracking-wider text-slate-500">
          Chỉ số & Thanh khoản
        </span>
        <button
          onClick={fetchOverview}
          disabled={isLoading}
          className="text-slate-400 hover:text-emerald-500 font-bold transition-colors"
          title="Làm mới dữ liệu"
        >
          ↻
        </button>
      </div>

      {isLoading && (
        <div className="flex-1 flex items-center justify-center text-slate-400 font-mono animate-pulse">
          Đang tổng hợp dữ liệu...
        </div>
      )}

      {error && (
        <div className="flex-1 flex flex-col items-center justify-center text-rose-500 p-2 text-center">
          <p>{error}</p>
          <button
            onClick={fetchOverview}
            className="mt-2 px-3 py-1 bg-slate-100 dark:bg-white/[0.05] rounded-full text-slate-700 dark:text-slate-300"
          >
            Thử lại
          </button>
        </div>
      )}

      {!isLoading && !error && data && (
        <div className="space-y-2.5">
          {/* Market Breadth Cards */}
          {data.breadth && (
            <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block mb-2">
                Độ rộng thị trường
              </span>
              <div className="grid grid-cols-3 gap-2 font-mono text-center">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Tăng</div>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {data.breadth.advances ?? data.breadth.gainers ?? "-"}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Đứng</div>
                  <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
                    {data.breadth.noChanges ?? data.breadth.unchanged ?? "-"}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                  <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">Giảm</div>
                  <div className="text-sm font-bold text-rose-600 dark:text-rose-400">
                    {data.breadth.declines ?? data.breadth.losers ?? "-"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Liquidity Stats */}
          {data.liquidity && (
            <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] font-mono space-y-1.5">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-400 text-[11px]">Tổng thanh khoản:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatNumber(data.liquidity.totalValue || data.liquidity.value)} tỷ đ
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-400 text-[11px]">Khối lượng giao dịch:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatNumber(data.liquidity.totalVolume || data.liquidity.volume)} CP
                </span>
              </div>
            </div>
          )}

          <div className="text-[10px] font-mono text-slate-400 text-right pt-1">
            Cập nhật: {new Date(data.asOf || Date.now()).toLocaleTimeString("vi-VN")}
          </div>
        </div>
      )}
    </div>
  );
}
