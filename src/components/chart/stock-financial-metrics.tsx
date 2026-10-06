"use client";

import React, { useState } from "react";
import type { ValuationRatios } from "@/lib/vnstock/types";
import {
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Building2,
} from "lucide-react";

interface StockFinancialMetricsProps {
  ratios: ValuationRatios | null;
  isLoading?: boolean;
  symbol: string;
}

export function StockFinancialMetrics({
  ratios,
  isLoading = false,
  symbol,
}: StockFinancialMetricsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading && !ratios) {
    return (
      <div className="mx-3 sm:mx-4 my-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 animate-pulse text-xs font-mono text-slate-400 flex items-center gap-2">
        <div className="h-3 w-16 bg-slate-200 dark:bg-zinc-800 rounded" />
        <div className="h-3 w-24 bg-slate-200 dark:bg-zinc-800 rounded" />
        <div className="h-3 w-20 bg-slate-200 dark:bg-zinc-800 rounded" />
        <span className="text-[11px] text-slate-400">Đang tải chỉ số định giá {symbol}...</span>
      </div>
    );
  }

  if (!ratios || (ratios.pe == null && ratios.pb == null && ratios.ps == null)) {
    return null;
  }

  const {
    pe,
    pb,
    ps,
    peg,
    epsGrowth,
    roe,
    roa,
    marketCap,
    industry,
    industryPe,
    industryPb,
    industryRoe,
    netProfitMargin,
  } = ratios;

  // Tính chênh lệch so với ngành (%)
  const calcDiff = (val?: number | null, ind?: number | null) => {
    if (val == null || ind == null || ind === 0) return null;
    return parseFloat((((val - ind) / ind) * 100).toFixed(1));
  };

  const diffPe = calcDiff(pe, industryPe);
  const diffPb = calcDiff(pb, industryPb);
  const diffRoe = calcDiff(roe, industryRoe);

  // Đánh giá PEG (Màu đặc)
  const renderPegBadge = () => {
    if (peg != null) {
      if (peg < 1) {
        return (
          <span
            className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-600 text-white"
            title={`PEG = ${peg} < 1: Tăng trưởng EPS (+${epsGrowth}%) vượt trội so với định giá P/E`}
          >
            Hấp dẫn ({peg})
          </span>
        );
      }
      if (peg <= 1.5) {
        return (
          <span
            className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-600 text-white"
            title={`PEG = ${peg}: Định giá hợp lý so với tăng trưởng (+${epsGrowth}%)`}
          >
            Hợp lý ({peg})
          </span>
        );
      }
      return (
        <span
          className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-600 text-white"
          title={`PEG = ${peg} > 1.5: Định giá cao so với tăng trưởng (+${epsGrowth}%)`}
        >
          Định giá cao ({peg})
        </span>
      );
    }

    if (epsGrowth != null && epsGrowth <= 0) {
      return (
        <span
          className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-rose-600 text-white"
          title={`Tăng trưởng EPS kỳ gần nhất âm (${epsGrowth}%), không tính được PEG dương`}
        >
          N/A (Tăng trưởng âm)
        </span>
      );
    }

    return <span className="text-slate-400">—</span>;
  };

  return (
    <div className="mx-3 sm:mx-4 my-1.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs overflow-hidden transition-all shadow-2xs select-none">
      {/* 1. Primary Compact Metrics Bar */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-3 py-1.5 font-mono">
        {/* Core Ratios */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 dark:text-zinc-300">
          <div className="flex items-center gap-1">
            <span className="text-slate-400 dark:text-zinc-500 font-sans text-[10px] uppercase font-semibold">
              P/E:
            </span>
            <strong className="text-slate-900 dark:text-white font-bold">
              {pe != null ? pe.toFixed(2) : "—"}
            </strong>
          </div>

          <span className="text-slate-300 dark:text-zinc-700 hidden sm:inline">|</span>

          <div className="flex items-center gap-1">
            <span className="text-slate-400 dark:text-zinc-500 font-sans text-[10px] uppercase font-semibold">
              P/B:
            </span>
            <strong className="text-slate-900 dark:text-white font-bold">
              {pb != null ? pb.toFixed(2) : "—"}
            </strong>
          </div>

          <span className="text-slate-300 dark:text-zinc-700 hidden sm:inline">|</span>

          <div className="flex items-center gap-1">
            <span className="text-slate-400 dark:text-zinc-500 font-sans text-[10px] uppercase font-semibold">
              P/S:
            </span>
            <strong className="text-slate-900 dark:text-white font-bold">
              {ps != null ? ps.toFixed(2) : "—"}
            </strong>
          </div>

          <span className="text-slate-300 dark:text-zinc-700 hidden sm:inline">|</span>

          {/* PEG Metric (Featured) */}
          <div className="flex items-center gap-1.5">
            <span
              className="text-slate-500 dark:text-zinc-400 font-sans text-[10px] uppercase font-bold flex items-center gap-0.5 cursor-help"
              title="PEG = P/E / Tốc độ tăng trưởng EPS (%). < 1 là định giá hấp dẫn."
            >
              PEG:
            </span>
            {renderPegBadge()}
          </div>

          <span className="text-slate-300 dark:text-zinc-700 hidden md:inline">|</span>

          <div className="hidden md:flex items-center gap-1">
            <span className="text-slate-400 dark:text-zinc-500 font-sans text-[10px] uppercase font-semibold">
              ROE:
            </span>
            <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
              {roe != null ? `${roe.toFixed(1)}%` : "—"}
            </strong>
          </div>

          <span className="text-slate-300 dark:text-zinc-700 hidden lg:inline">|</span>

          <div className="hidden lg:flex items-center gap-1">
            <span className="text-slate-400 dark:text-zinc-500 font-sans text-[10px] uppercase font-semibold">
              ROA:
            </span>
            <strong className="text-slate-800 dark:text-zinc-200 font-bold">
              {roa != null ? `${roa.toFixed(1)}%` : "—"}
            </strong>
          </div>

          {marketCap != null && (
            <>
              <span className="text-slate-300 dark:text-zinc-700 hidden lg:inline">|</span>
              <div className="hidden lg:flex items-center gap-1 text-slate-500 dark:text-zinc-400">
                <span className="text-[10px]">Vốn hóa:</span>
                <span className="font-semibold text-slate-800 dark:text-zinc-200">
                  {marketCap.toLocaleString()} tỷ
                </span>
              </div>
            </>
          )}
        </div>

        {/* Toggle Industry Benchmark Comparison */}
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-sans font-medium transition-colors cursor-pointer ${
            isExpanded
              ? "bg-emerald-600 text-white"
              : "bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-300 dark:hover:bg-zinc-700"
          }`}
          title="Bấm để xem đối chiếu chỉ số với trung bình ngành"
        >
          <Building2 size={12} />
          <span>{industry ? `Ngành: ${industry}` : "So sánh ngành"}</span>
          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* 2. Expanded Industry Benchmark & Deep Fundamentals Table */}
      {isExpanded && (
        <div className="px-3 pb-2.5 pt-1.5 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-[11px] animate-in fade-in duration-150">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-zinc-200">
              <BarChart3 size={13} className="text-emerald-500" />
              <span>Đối chiếu {symbol} với Trung bình ngành {industry ? `(${industry})` : ""}</span>
            </div>
            {epsGrowth != null && (
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
                Tăng trưởng EPS cùng kỳ (YoY):{" "}
                <strong
                  className={epsGrowth >= 0 ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}
                >
                  {epsGrowth >= 0 ? `+${epsGrowth}%` : `${epsGrowth}%`}
                </strong>
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
            {/* Box 1: P/E vs Ngành */}
            <div className="p-2 rounded-md bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
              <div className="text-[10px] font-sans text-slate-400 dark:text-zinc-500 font-medium">
                P/E vs Trung bình ngành
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {pe != null ? `${pe.toFixed(2)}x` : "—"}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                  Ngành: {industryPe != null ? `${industryPe.toFixed(2)}x` : "—"}
                </span>
              </div>
              {diffPe != null && (
                <div
                  className={`flex items-center gap-0.5 mt-1 text-[10px] font-semibold ${
                    diffPe < 0 ? "text-emerald-500" : "text-amber-500"
                  }`}
                >
                  {diffPe < 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                  <span>{diffPe < 0 ? `Thấp hơn ngành ${Math.abs(diffPe)}%` : `Cao hơn ngành ${diffPe}%`}</span>
                </div>
              )}
            </div>

            {/* Box 2: P/B vs Ngành */}
            <div className="p-2 rounded-md bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
              <div className="text-[10px] font-sans text-slate-400 dark:text-zinc-500 font-medium">
                P/B vs Trung bình ngành
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {pb != null ? `${pb.toFixed(2)}x` : "—"}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                  Ngành: {industryPb != null ? `${industryPb.toFixed(2)}x` : "—"}
                </span>
              </div>
              {diffPb != null && (
                <div
                  className={`flex items-center gap-0.5 mt-1 text-[10px] font-semibold ${
                    diffPb < 0 ? "text-emerald-500" : "text-amber-500"
                  }`}
                >
                  {diffPb < 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                  <span>{diffPb < 0 ? `Thấp hơn ngành ${Math.abs(diffPb)}%` : `Cao hơn ngành ${diffPb}%`}</span>
                </div>
              )}
            </div>

            {/* Box 3: ROE vs Ngành */}
            <div className="p-2 rounded-md bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
              <div className="text-[10px] font-sans text-slate-400 dark:text-zinc-500 font-medium">
                ROE vs Trung bình ngành
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {roe != null ? `${roe.toFixed(1)}%` : "—"}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                  Ngành: {industryRoe != null ? `${industryRoe.toFixed(1)}%` : "—"}
                </span>
              </div>
              {diffRoe != null && (
                <div
                  className={`flex items-center gap-0.5 mt-1 text-[10px] font-semibold ${
                    diffRoe > 0 ? "text-emerald-500" : "text-rose-500"
                  }`}
                >
                  {diffRoe > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  <span>{diffRoe > 0 ? `Hiệu quả hơn ${diffRoe}%` : `Thấp hơn ngành ${Math.abs(diffRoe)}%`}</span>
                </div>
              )}
            </div>

            {/* Box 4: Định giá PEG & Biên lợi nhuận */}
            <div className="p-2 rounded-md bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
              <div className="text-[10px] font-sans text-slate-400 dark:text-zinc-500 font-medium">
                Định giá PEG & Biên ròng
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  PEG: {peg != null ? peg.toFixed(2) : "—"}
                </span>
                {netProfitMargin != null && (
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                    Biên: {netProfitMargin.toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="mt-1 text-[10px] text-slate-500 dark:text-zinc-400 truncate">
                {peg != null
                  ? peg < 1
                    ? "✓ Cổ phiếu tăng trưởng giá rẻ"
                    : peg <= 1.5
                    ? "✓ Định giá sát tốc độ tăng trưởng"
                    : "⚠️ Tăng trưởng thấp hơn mức định giá P/E"
                  : "Dữ liệu tăng trưởng chưa đủ"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
