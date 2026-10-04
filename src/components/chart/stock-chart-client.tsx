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
    const bgColor = isDark ? "#0c1017" : "#ffffff";
    const textColor = isDark ? "#64748b" : "#475569";
    const gridColor = isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.03)";

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
        borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
      },
      timeScale: {
        borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
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

    // Candlestick Series: Vietnam standard
    const candleSeries = chart.addCandlestickSeries({
      upColor: "#10b981", // Crisp Emerald
      downColor: "#f43f5e", // Neon Rose
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#f43f5e",
    });
    candleSeriesRef.current = candleSeries;

    // SMA Series
    const sma20 = chart.addLineSeries({
      color: "#38bdf8",
      lineWidth: 1,
      title: "SMA 20",
    });
    sma20SeriesRef.current = sma20;

    const sma50 = chart.addLineSeries({
      color: "#f59e0b",
      lineWidth: 1,
      title: "SMA 50",
    });
    sma50SeriesRef.current = sma50;

    // Crosshair handler for tooltip
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

    // Resize observer
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

  // Update chart data when candles change
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
          color: c.close >= c.open ? "rgba(16, 185, 129, 0.35)" : "rgba(244, 63, 94, 0.35)",
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

  // Handle comparison symbol
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
            color: "#c084fc",
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
      {/* Top Header: Symbol Info & Indicators Segmented Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-black/[0.04] dark:border-white/[0.06]">
        {/* Symbol badge & Price */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold font-mono tracking-wider text-slate-900 dark:text-white">
              {symbol}
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              HOSE
            </span>
          </div>

          {displayData && (
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                {formatPrice(displayData.close)}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  isUp
                    ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20"
                    : "bg-rose-500/15 text-rose-500 border border-rose-500/20"
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

        {/* Timeframe Segmented Control & Indicator Toggles */}
        <div className="flex items-center gap-2 text-xs">
          {/* Segmented Timeframe Pill */}
          <div className="flex p-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08]">
            {(["1M", "3M", "6M", "1Y"] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono transition-all duration-200 ${
                  timeframe === tf
                    ? "bg-white dark:bg-white/20 text-slate-950 dark:text-white font-bold shadow-sm"
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
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono transition-all duration-200 ${
                showSma20
                  ? "bg-sky-500/15 text-sky-500 border border-sky-500/30 font-semibold"
                  : "bg-slate-100 dark:bg-white/[0.04] text-slate-400 opacity-60"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              SMA20
            </button>
            <button
              onClick={() => setShowSma50(!showSma50)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono transition-all duration-200 ${
                showSma50
                  ? "bg-amber-500/15 text-amber-500 border border-amber-500/30 font-semibold"
                  : "bg-slate-100 dark:bg-white/[0.04] text-slate-400 opacity-60"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              SMA50
            </button>
          </div>
        </div>
      </div>

      {/* Floating Metrics Bar: O H L C */}
      {displayData && (
        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 py-1.5 font-mono">
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

      {/* TradingView Canvas */}
      <div className="relative flex-1 min-h-[320px] w-full rounded-xl overflow-hidden mt-1">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-[#0c1017]/80 backdrop-blur-sm z-10">
            <span className="text-xs font-mono text-emerald-500 animate-pulse">
              Đang tải dữ liệu {symbol}...
            </span>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-[#0c1017]/90 z-10 p-4">
            <p className="text-rose-500 text-xs mb-2">{error}</p>
            <button
              onClick={fetchCandles}
              className="px-3 py-1 bg-slate-200 dark:bg-white/10 rounded-full text-xs font-medium"
            >
              Thử lại
            </button>
          </div>
        )}
        <div ref={chartContainerRef} className="h-full w-full" />
      </div>

      {/* Bottom Bar: Compare symbol input pill */}
      <div className="pt-2 mt-1 border-t border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between text-xs">
        <form onSubmit={handleAddComparison} className="flex items-center gap-1.5">
          <input
            type="text"
            placeholder="So sánh mã (VCB)"
            value={compareSymbol}
            onChange={(e) => setCompareSymbol(e.target.value)}
            className="px-3 py-1 text-xs uppercase bg-slate-100 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] rounded-full w-36 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
          />
          <button
            type="submit"
            disabled={compareLoading || !compareSymbol.trim()}
            className="px-3 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] border border-black/[0.04] dark:border-white/[0.08] text-slate-700 dark:text-slate-300 transition-all active:scale-[0.96] disabled:opacity-40"
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
