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
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-sm text-xs">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
        <h3 className="font-semibold uppercase tracking-wider text-slate-500">
          Tổng quan thị trường
        </h3>
        <button
          onClick={fetchOverview}
          disabled={isLoading}
          className="text-slate-400 hover:text-emerald-500 font-bold"
          title="Làm mới"
        >
          ↻
        </button>
      </div>

      {isLoading && (
        <div className="flex-1 flex items-center justify-center text-slate-400 animate-pulse">
          Đang tải dữ liệu thị trường...
        </div>
      )}

      {error && (
        <div className="flex-1 flex flex-col items-center justify-center text-rose-500">
          <p>{error}</p>
          <button
            onClick={fetchOverview}
            className="mt-2 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300"
          >
            Thử lại
          </button>
        </div>
      )}

      {!isLoading && !error && data && (
        <div className="space-y-3">
          {/* Breadth / Gainers & Losers */}
          {data.breadth && (
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
              <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Độ rộng thị trường
              </span>
              <div className="flex items-center justify-between font-mono">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  ▲ {data.breadth.advances ?? data.breadth.gainers ?? "-"} Tăng
                </span>
                <span className="text-amber-500 font-bold">
                  ■ {data.breadth.noChanges ?? data.breadth.unchanged ?? "-"} Đứng
                </span>
                <span className="text-rose-600 dark:text-rose-400 font-bold">
                  ▼ {data.breadth.declines ?? data.breadth.losers ?? "-"} Giảm
                </span>
              </div>
            </div>
          )}

          {/* Liquidity */}
          {data.liquidity && (
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/50 dark:border-slate-700/50 font-mono">
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Tổng thanh khoản:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatNumber(data.liquidity.totalValue || data.liquidity.value)} tỷ đ
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Tổng khối lượng:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatNumber(data.liquidity.totalVolume || data.liquidity.volume)} CP
                </span>
              </div>
            </div>
          )}

          {/* Overview notes / timestamp */}
          <div className="text-[10px] text-slate-400 text-right">
            Cập nhật lúc: {new Date(data.asOf || Date.now()).toLocaleTimeString("vi-VN")}
          </div>
        </div>
      )}
    </div>
  );
}
