"use client";

import dynamic from "next/dynamic";
import React from "react";

const DynamicStockChart = dynamic(
  () => import("./stock-chart-client"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[380px] w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
        <span className="text-sm text-slate-400 animate-pulse">
          Đang khởi tạo biểu đồ...
        </span>
      </div>
    ),
  }
);

interface StockChartProps {
  symbol: string;
  defaultDays?: number;
}

export function StockChart({ symbol, defaultDays }: StockChartProps) {
  return <DynamicStockChart symbol={symbol} defaultDays={defaultDays} />;
}
