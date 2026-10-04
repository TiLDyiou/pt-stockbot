"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  ColorType,
  CrosshairMode,
} from "lightweight-charts";
import type { CandleItem } from "@/lib/vnstock/types";
import { calculateSMA, calculateNormalizedPercentage } from "./chart-utils";
import { formatPrice, formatPercent, formatVolume } from "@/lib/utils/format";

interface StockChartClientProps {
  symbol: string;
  defaultDays?: number;
}

type Timeframe = "1M" | "3M" | "6M" | "1Y";

const TIMEFRAME_DAYS: Record<Timeframe, number> = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
};

export default function StockChartClient({
  symbol,
  defaultDays = 120,
}: StockChartClientProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);

  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const sma20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const sma50SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const compareSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const [timeframe, setTimeframe] = useState<Timeframe>("6M");
  const [showSma20, setShowSma20] = useState(true);
  const [showSma50, setShowSma50] = useState(true);

  const [candles, setCandles] = useState<CandleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Crosshair hover state
  const [hoveredData, setHoveredData] = useState<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    changePct?: number;
  } | null>(null);

  // Comparison symbol
  const [compareSymbol, setCompareSymbol] = useState("");
  const [activeCompareSymbol, setActiveCompareSymbol] = useState<string | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  // Fetch primary candles
  const fetchCandles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const days = TIMEFRAME_DAYS[timeframe] || defaultDays;
      const res = await fetch(`/api/candles?symbol=${symbol}&days=${days}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Không thể tải dữ liệu nến");
      }
      const data = await res.json();
      setCandles(data.candles || []);
    } catch (err: any) {
      setError(err?.message || "Lỗi tải biểu đồ");
    } finally {
      setIsLoading(false);
    }
  }, [symbol, timeframe, defaultDays]);

  useEffect(() => {
    fetchCandles();
  }, [fetchCandles]);

  // Initialize Lightweight Charts
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    container.innerHTML = "";

    const isDark = document.documentElement.classList.contains("dark");
    const bgColor = isDark ? "#111722" : "#ffffff";
    const textColor = isDark ? "#64748b" : "#475569";
    const gridColor = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)";

    const chart = createChart(container, {
      width: container.clientWidth || 600,
      height: 380,
      layout: {
        background: { type: ColorType.Solid, color: bgColor },
        textColor: textColor,
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: isDark ? "#1e293b" : "#e2e8f0",
      },
      timeScale: {
        borderColor: isDark ? "#1e293b" : "#e2e8f0",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartInstanceRef.current = chart;

    // Volume Series
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeriesRef.current = volumeSeries;

    // Candlestick Series: Vietnam standard Green / Red
    const candleSeries = chart.addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });
    candleSeriesRef.current = candleSeries;

    // SMA Series
    const sma20 = chart.addLineSeries({
      color: "#0284c7",
      lineWidth: 1,
      title: "SMA 20",
    });
    sma20SeriesRef.current = sma20;

    const sma50 = chart.addLineSeries({
      color: "#ea580c",
      lineWidth: 1,
      title: "SMA 50",
    });
    sma50SeriesRef.current = sma50;

    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.seriesData) {
        setHoveredData(null);
        return;
      }
      const candleData = param.seriesData.get(candleSeries) as any;
      const volData = param.seriesData.get(volumeSeries) as any;

      if (candleData) {
        const changePct =
          candleData.open > 0
            ? ((candleData.close - candleData.open) / candleData.open) * 100
            : 0;
        setHoveredData({
          time: String(param.time),
          open: candleData.open,
          high: candleData.high,
          low: candleData.low,
          close: candleData.close,
          volume: volData?.value || 0,
          changePct,
        });
      }
    });

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect && chartInstanceRef.current) {
          chartInstanceRef.current.applyOptions({
            width: entry.contentRect.width,
          });
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!candles || candles.length === 0) return;

    if (candleSeriesRef.current) {
      candleSeriesRef.current.setData(
        candles.map((c) => ({
          time: c.time as any,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
    }

    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.setData(
        candles.map((c) => ({
          time: c.time as any,
          value: c.volume,
          color: c.close >= c.open ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)",
        }))
      );
    }

    if (sma20SeriesRef.current) {
      if (showSma20) {
        const smaData = calculateSMA(candles, 20);
        sma20SeriesRef.current.setData(
          smaData.map((d) => ({ time: d.time as any, value: d.value }))
        );
      } else {
        sma20SeriesRef.current.setData([]);
      }
    }

    if (sma50SeriesRef.current) {
      if (showSma50) {
        const smaData = calculateSMA(candles, 50);
        sma50SeriesRef.current.setData(
          smaData.map((d) => ({ time: d.time as any, value: d.value }))
        );
      } else {
        sma50SeriesRef.current.setData([]);
      }
    }

    if (chartInstanceRef.current) {
      chartInstanceRef.current.timeScale().fitContent();
    }
  }, [candles, showSma20, showSma50]);

  const handleAddComparison = async (e: React.FormEvent) => {
    e.preventDefault();
    const sym = compareSymbol.trim().toUpperCase();
    if (!sym || sym === symbol) return;

    setCompareLoading(true);
    try {
      const days = TIMEFRAME_DAYS[timeframe] || defaultDays;
      const res = await fetch(`/api/candles?symbol=${sym}&days=${days}`);
      if (!res.ok) throw new Error("Không tải được mã so sánh");
      const data = await res.json();
      const compCandles = data.candles as CandleItem[];

      if (!compCandles || compCandles.length === 0) {
        throw new Error("Không có dữ liệu so sánh");
      }

      const normData = calculateNormalizedPercentage(compCandles);

      if (chartInstanceRef.current) {
        if (!compareSeriesRef.current) {
          compareSeriesRef.current = chartInstanceRef.current.addLineSeries({
            color: "#a855f7",
            lineWidth: 2,
            title: `${sym} (%)`,
            priceScaleId: "compare",
          });
          compareSeriesRef.current.priceScale().applyOptions({
            scaleMargins: { top: 0.1, bottom: 0.2 },
          });
        }
        compareSeriesRef.current.setData(
          normData.map((d) => ({ time: d.time as any, value: d.value }))
        );
        setActiveCompareSymbol(sym);
      }
    } catch (err: any) {
      alert(err.message || "Lỗi so sánh");
    } finally {
      setCompareLoading(false);
      setCompareSymbol("");
    }
  };

  const removeComparison = () => {
    if (chartInstanceRef.current && compareSeriesRef.current) {
      chartInstanceRef.current.removeSeries(compareSeriesRef.current);
      compareSeriesRef.current = null;
      setActiveCompareSymbol(null);
    }
  };

  const latestCandle = candles[candles.length - 1];
  const displayData = hoveredData || (latestCandle ? {
    time: latestCandle.time,
    open: latestCandle.open,
    high: latestCandle.high,
    low: latestCandle.low,
    close: latestCandle.close,
    volume: latestCandle.volume,
    changePct:
      latestCandle.open > 0
        ? ((latestCandle.close - latestCandle.open) / latestCandle.open) * 100
        : 0,
  } : null);

  const isUp = (displayData?.changePct || 0) >= 0;

  return (
    <div className="flex flex-col h-full w-full select-none">
      {/* Top Header: Symbol Info & Timeframe Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-1 border-b border-slate-200 dark:border-terminal-border">
        {/* Symbol badge & Live Price */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold font-mono tracking-wider text-slate-900 dark:text-white">
              {symbol}
            </span>
            <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-slate-100 dark:bg-terminal-subtle text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              HOSE
            </span>
          </div>

          {displayData && (
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                {formatPrice(displayData.close)}
              </span>
              <span
                className={`font-semibold ${
                  isUp ? "text-emerald-500" : "text-rose-500"
                }`}
              >
                {formatPercent(displayData.changePct)}
              </span>
              <span className="text-slate-400 text-[11px] hidden sm:inline">
                KL: {formatVolume(displayData.volume)}
              </span>
            </div>
          )}
        </div>

        {/* Timeframe & Overlays */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          {/* Timeframe Buttons */}
          <div className="flex bg-slate-100 dark:bg-terminal-subtle p-0.5 rounded border border-slate-200 dark:border-slate-700/60">
            {(["1M", "3M", "6M", "1Y"] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  timeframe === tf
                    ? "bg-white dark:bg-emerald-600 text-slate-900 dark:text-white font-bold shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* SMA Toggles */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSma20(!showSma20)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border transition-colors ${
                showSma20
                  ? "bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border-sky-300 dark:border-sky-800 font-semibold"
                  : "bg-slate-100 dark:bg-terminal-subtle text-slate-400 border-transparent line-through"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              SMA20
            </button>
            <button
              onClick={() => setShowSma50(!showSma50)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border transition-colors ${
                showSma50
                  ? "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800 font-semibold"
                  : "bg-slate-100 dark:bg-terminal-subtle text-slate-400 border-transparent line-through"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              SMA50
            </button>
          </div>
        </div>
      </div>

      {/* OHLC Bar */}
      {displayData && (
        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 py-1 font-mono">
          <span>Ngày: {displayData.time}</span>
          <span>O: {formatPrice(displayData.open)}</span>
          <span>H: {formatPrice(displayData.high)}</span>
          <span>L: {formatPrice(displayData.low)}</span>
          <span>C: {formatPrice(displayData.close)}</span>

          {activeCompareSymbol && (
            <span className="text-purple-400 font-bold ml-auto flex items-center gap-1">
              So sánh: {activeCompareSymbol}
              <button
                onClick={removeComparison}
                className="text-xs hover:text-rose-400 ml-1"
                title="Bỏ so sánh"
              >
                ✕
              </button>
            </span>
          )}
        </div>
      )}

      {/* Chart Canvas */}
      <div className="relative flex-1 min-h-[320px] w-full mt-1">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-terminal-panel/80 z-10">
            <span className="text-xs font-mono text-emerald-500 animate-pulse">
              Đang tải nến {symbol}...
            </span>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-terminal-panel/90 z-10 p-4">
            <p className="text-rose-500 text-xs mb-2">{error}</p>
            <button
              onClick={fetchCandles}
              className="px-3 py-1 bg-slate-200 dark:bg-terminal-subtle rounded text-xs"
            >
              Thử lại
            </button>
          </div>
        )}
        <div ref={chartContainerRef} className="h-full w-full" />
      </div>

      {/* Bottom Comparison Form */}
      <div className="pt-2 border-t border-slate-200 dark:border-terminal-border flex items-center justify-between text-xs">
        <form onSubmit={handleAddComparison} className="flex items-center gap-1.5">
          <input
            type="text"
            placeholder="So sánh mã (VD: VCB)"
            value={compareSymbol}
            onChange={(e) => setCompareSymbol(e.target.value)}
            className="px-2 py-0.5 text-xs uppercase bg-slate-50 dark:bg-terminal-subtle border border-slate-200 dark:border-slate-700 rounded w-32 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
          />
          <button
            type="submit"
            disabled={compareLoading || !compareSymbol.trim()}
            className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-terminal-subtle hover:bg-slate-200 dark:hover:bg-terminal-hover border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 font-mono disabled:opacity-40"
          >
            {compareLoading ? "..." : "+ So sánh %"}
          </button>
        </form>

        <span className="text-[10px] font-mono text-slate-400">
          TradingView Lightweight Charts
        </span>
      </div>
    </div>
  );
}
