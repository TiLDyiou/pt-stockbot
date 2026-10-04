"use client";

import dynamic from "next/dynamic";
import React from "react";

const DynamicStockChart = dynamic(
  () => import("./stock-chart-client"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[380px] w-full bg-slate-50 dark:bg-[#171718] border border-slate-200 dark:border-zinc-800 rounded-lg">
        <span className="text-sm text-slate-400 animate-pulse">
          Đang khởi tạo biểu đồ...
        </span>
      </div>
    ),
  }
);

export interface StockChartProps {
  symbol: string;
  defaultDays?: number;
  openSymbols?: string[];
  activeSymbol?: string;
  onSelectSymbol?: (sym: string) => void;
  onAddSymbol?: (sym: string) => void;
  onCloseSymbol?: (sym: string) => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  onCloseModule?: () => void;
}

export function StockChart(props: StockChartProps) {
  return <DynamicStockChart {...props} />;
}
