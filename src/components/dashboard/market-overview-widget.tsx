"use client";

import React, { useEffect, useState, useCallback } from "react";
import { formatNumber } from "@/lib/utils/format";
import {
  EarthIcon,
  RefreshCwIcon,
  XIcon,
} from "lucide-animated";
import { Maximize2, Minimize2 } from "lucide-react";
import { BreadthDonutChart } from "./market-charts/breadth-donut-chart";
import { CashFlowBarChart } from "./market-charts/cash-flow-bar-chart";
import { MarketHeatmap } from "./market-charts/market-heatmap";
import { IndexImpactChart } from "./market-charts/index-impact-chart";
import { ForeignFlowView } from "./market-charts/foreign-flow-view";
import { LiquidityCompareView } from "./market-charts/liquidity-compare-view";

interface MarketOverviewWidgetProps {
  onSelectSymbol?: (symbol: string) => void;
  onCloseModule?: () => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  dragHandle?: React.ReactNode;
}

type MainTab = "bien_dong" | "nuoc_ngoai" | "tu_doanh" | "thanh_khoan";
type SubTab = "dong_tien" | "tac_dong";
type Exchange = "HSX" | "HNX" | "UPCOM" | "ALL";

export function MarketOverviewWidget({
  onSelectSymbol,
  onCloseModule,
  isMaximized = false,
  onToggleMaximize,
  dragHandle,
}: MarketOverviewWidgetProps) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab & Filter state matching reference screenshot:
  const [mainTab, setMainTab] = useState<MainTab>("bien_dong");
  const [subTab, setSubTab] = useState<SubTab>("dong_tien");
  const [exchange, setExchange] = useState<Exchange>("HSX");

  const fetchOverview = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/market?exchange=${exchange}`);
      if (!res.ok) throw new Error("Không thể tải dữ liệu thị trường");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err?.message || "Lỗi tải thị trường");
    } finally {
      setIsLoading(false);
    }
  }, [exchange]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  return (
    <div className="flex flex-col w-full h-full bg-white dark:bg-[#171718] text-slate-800 dark:text-zinc-200 overflow-hidden select-none">
      {/* 1. Module Header */}
      <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 shrink-0">
        <div className="flex items-center gap-2">
          {dragHandle}
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <EarthIcon size={15} className="text-emerald-500" animateOnHover />
          </div>
          {data?.index && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300">
              <strong className="text-slate-900 dark:text-white">{data.index.symbol}</strong>
              <span>{data.index.close?.toFixed(2)}</span>
              <span
                className={
                  data.index.change >= 0 ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"
                }
              >
                {data.index.change >= 0 ? "+" : ""}
                {data.index.change?.toFixed(2)} ({data.index.changePercent >= 0 ? "+" : ""}
                {data.index.changePercent?.toFixed(2)}%)
              </span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {onToggleMaximize && (
            <button
              onClick={onToggleMaximize}
              className="p-1.5 rounded-md bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-zinc-700 transition-colors cursor-pointer"
              title={isMaximized ? "Thu nhỏ về bảng chia" : "Mở rộng toàn màn hình"}
            >
              {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          )}

          {onCloseModule && (
            <button
              onClick={onCloseModule}
              className="p-1.5 rounded-md bg-slate-100 dark:bg-zinc-800 hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-500 border border-slate-200 dark:border-zinc-700 transition-colors cursor-pointer"
              title="Đóng module Tổng quan"
            >
              <XIcon size={13} animateOnHover />
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Navigation Bar (Tabs & Exchange Pills) */}
      <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-slate-100 dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 border-b border-slate-200 dark:border-zinc-800 shrink-0 gap-2">
        {/* Main Tabs on left */}
        <div className="flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setMainTab("bien_dong")}
            className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
              mainTab === "bien_dong"
                ? "bg-emerald-600 text-white font-bold shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800"
            }`}
          >
            Biến động
          </button>

          <button
            type="button"
            onClick={() => setMainTab("nuoc_ngoai")}
            className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
              mainTab === "nuoc_ngoai"
                ? "bg-emerald-600 text-white font-bold shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800"
            }`}
          >
            Nước ngoài
          </button>

          <button
            type="button"
            onClick={() => setMainTab("tu_doanh")}
            className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
              mainTab === "tu_doanh"
                ? "bg-emerald-600 text-white font-bold shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800"
            }`}
          >
            Tự doanh
          </button>

          <button
            type="button"
            onClick={() => setMainTab("thanh_khoan")}
            className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
              mainTab === "thanh_khoan"
                ? "bg-emerald-600 text-white font-bold shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800"
            }`}
          >
            Thanh khoản
          </button>
        </div>

        {/* Exchange Selector on right */}
        <div className="flex items-center gap-1 font-mono text-xs">
          <button
            type="button"
            onClick={() => setExchange("HSX")}
            className={`px-2.5 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
              exchange === "HSX"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-700"
            }`}
          >
            HSX
          </button>
          <button
            type="button"
            onClick={() => setExchange("HNX")}
            className={`px-2.5 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
              exchange === "HNX"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-700"
            }`}
          >
            HNX
          </button>
          <button
            type="button"
            onClick={() => setExchange("UPCOM")}
            className={`px-2.5 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
              exchange === "UPCOM"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-700"
            }`}
          >
            UPCOM
          </button>
          <button
            type="button"
            onClick={() => setExchange("ALL")}
            className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
              exchange === "ALL"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-700"
            }`}
          >
            TẤT CẢ
          </button>
        </div>
      </div>

      {/* 3. Sub-Tab Bar (Under Biến động) */}
      {mainTab === "bien_dong" && (
        <div className="flex items-center gap-4 px-4 py-1.5 bg-slate-50 dark:bg-zinc-900/40 border-b border-slate-200/80 dark:border-zinc-800/80 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setSubTab("dong_tien")}
            className={`font-semibold cursor-pointer pb-0.5 border-b-2 transition-colors ${
              subTab === "dong_tien"
                ? "text-emerald-600 dark:text-emerald-400 border-emerald-500 font-bold"
                : "text-slate-600 dark:text-zinc-400 border-transparent hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Dòng tiền
          </button>

          <button
            type="button"
            onClick={() => setSubTab("tac_dong")}
            className={`font-semibold cursor-pointer pb-0.5 border-b-2 transition-colors ${
              subTab === "tac_dong"
                ? "text-emerald-600 dark:text-emerald-400 border-emerald-500 font-bold"
                : "text-slate-600 dark:text-zinc-400 border-transparent hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Tác động tới index
          </button>
        </div>
      )}

      {/* 4. Loading & Error States */}
      {isLoading && (
        <div className="p-8 flex-1 flex items-center justify-center text-slate-400 font-mono text-xs animate-pulse">
          Đang tải dữ liệu biểu đồ và phân bổ dòng tiền thị trường...
        </div>
      )}

      {error && !isLoading && (
        <div className="p-6 flex-1 flex flex-col items-center justify-center text-rose-500 text-center">
          <p className="text-xs mb-2">{error}</p>
          <button
            onClick={fetchOverview}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 cursor-pointer"
          >
            <RefreshCwIcon size={12} animateOnHover />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {/* 5. Main Active Tab View */}
      {!isLoading && !error && data && (
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
          {/* View 1: Biến động -> Dòng tiền (Matches the Screenshot Exactly) */}
          {mainTab === "bien_dong" && subTab === "dong_tien" && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Upper Section: 2 Charts Side-by-Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2 sm:p-3 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-black/20 shrink-0">
                {/* Left: Donut / Pie Chart (Số lượng CP Tăng, Giảm, Không đổi) */}
                <div className="h-[210px] sm:h-[220px] bg-white dark:bg-zinc-900/60 rounded-lg border border-slate-200/80 dark:border-zinc-800/80 shadow-2xs">
                  <BreadthDonutChart
                    advancing={data.breadth?.advancing ?? 94}
                    unchanged={data.breadth?.unchanged ?? 50}
                    declining={data.breadth?.declining ?? 229}
                    ceiling={data.breadth?.ceiling ?? 4}
                    floor={data.breadth?.floor ?? 10}
                  />
                </div>

                {/* Right: Bar Chart (Phân bố dòng tiền) */}
                <div className="h-[210px] sm:h-[220px] bg-white dark:bg-zinc-900/60 rounded-lg border border-slate-200/80 dark:border-zinc-800/80 shadow-2xs">
                  <CashFlowBarChart data={data.cashFlow} />
                </div>
              </div>

              {/* Lower Section: Multi-Sector Treemap Heatmap */}
              <div className="flex-1 min-h-[360px] flex flex-col">
                <MarketHeatmap
                  sectors={data.sectors || []}
                  exchangeFilter={exchange}
                  onSelectSymbol={onSelectSymbol}
                />
              </div>
            </div>
          )}

          {/* View 2: Biến động -> Tác động tới index */}
          {mainTab === "bien_dong" && subTab === "tac_dong" && (
            <div className="flex-1 flex flex-col min-h-0">
              <IndexImpactChart
                positive={data.indexImpact?.positive || []}
                negative={data.indexImpact?.negative || []}
                onSelectSymbol={onSelectSymbol}
              />
            </div>
          )}

          {/* View 3: Nước ngoài (Foreign Flow) */}
          {mainTab === "nuoc_ngoai" && (
            <div className="flex-1 flex flex-col min-h-0">
              <ForeignFlowView
                foreign={data.foreign}
                onSelectSymbol={onSelectSymbol}
              />
            </div>
          )}

          {/* View 4: Tự doanh (Proprietary Trading) */}
          {mainTab === "tu_doanh" && (
            <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
              <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200 tracking-wide text-center">
                Giao dịch khối tự doanh công ty chứng khoán
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800">
                  <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">Tự doanh Mua</span>
                  <span className="text-lg font-black font-mono text-emerald-500 mt-0.5 block">
                    {formatNumber(482.35)} tỷ VNĐ
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800">
                  <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">Tự doanh Bán</span>
                  <span className="text-lg font-black font-mono text-rose-500 mt-0.5 block">
                    {formatNumber(315.80)} tỷ VNĐ
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800">
                  <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">Mua ròng</span>
                  <span className="text-lg font-black font-mono text-emerald-500 mt-0.5 block">
                    +{formatNumber(166.55)} tỷ VNĐ
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800">
                <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 block mb-2">
                  Top cổ phiếu tự doanh mua ròng nhiều nhất
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {["FPT", "MWG", "TCB", "HPG", "MBB", "ACB", "STB", "VNM"].map((sym) => (
                    <div
                      key={sym}
                      onClick={() => onSelectSymbol?.(sym)}
                      className="p-2 rounded bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-between cursor-pointer hover:border-emerald-500"
                    >
                      <span className="font-bold font-mono text-xs">{sym}</span>
                      <span className="text-emerald-500 font-mono text-[11px] font-bold">+18.5 tỷ</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* View 5: Thanh khoản (Liquidity Comparison) */}
          {mainTab === "thanh_khoan" && (
            <div className="flex-1 flex flex-col min-h-0">
              <LiquidityCompareView liquidity={data.liquidity} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
