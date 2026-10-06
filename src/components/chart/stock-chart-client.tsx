"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  ColorType,
  CrosshairMode,
} from "lightweight-charts";
import type { CandleItem, ValuationRatios } from "@/lib/vnstock/types";
import { calculateSMA, calculateNormalizedPercentage } from "./chart-utils";
import { formatPrice, formatPercent, formatVolume } from "@/lib/utils/format";
import { loadWatchlist } from "@/lib/storage/layout-storage";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  XIcon,
  Maximize2Icon,
  MinimizeIcon,
  RefreshCwIcon,
  GitCompareArrowsIcon,
  GripVerticalIcon,
} from "lucide-animated";
import { StockFinancialMetrics } from "./stock-financial-metrics";

interface StockChartClientProps {
  symbol: string;
  defaultDays?: number;
  openSymbols?: string[];
  activeSymbol?: string;
  onSelectSymbol?: (sym: string) => void;
  onAddSymbol?: (sym: string) => void;
  onCloseSymbol?: (sym: string) => void;
  onSwapSymbol?: (oldSym: string, newSym: string) => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  onCloseModule?: () => void;
  dragHandle?: React.ReactNode;
}

type Timeframe = "1M" | "3M" | "6M" | "1Y";

const TIMEFRAME_DAYS: Record<Timeframe, number> = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
};

export const COMPARE_PALETTE = [
  "#a855f7", // Tím
  "#06b6d4", // Xanh lơ (Cyan)
  "#f97316", // Cam tươi
  "#ec4899", // Hồng sen
  "#14b8a6", // Teal / Xanh mòng két
  "#eab308", // Vàng hổ phách
  "#3b82f6", // Xanh dương
  "#84cc16", // Xanh chanh
];

export default function StockChartClient({
  symbol,
  defaultDays = 120,
  openSymbols,
  activeSymbol: _activeSymbol,
  onSelectSymbol,
  onAddSymbol: _onAddSymbol,
  onCloseSymbol,
  onSwapSymbol,
  isMaximized = false,
  onToggleMaximize,
  onCloseModule,
  dragHandle,
}: StockChartClientProps) {
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);

  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const sma20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const sma50SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const compareSeriesMapRef = useRef<Map<string, ISeriesApi<"Line">>>(
    new Map(),
  );
  const prevCloseMapRef = useRef<Map<string, number>>(new Map());

  const [timeframe, setTimeframe] = useState<Timeframe>("6M");
  const [showSma20, setShowSma20] = useState(true);
  const [showSma50, setShowSma50] = useState(true);

  const [candles, setCandles] = useState<CandleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ratios, setRatios] = useState<ValuationRatios | null>(null);
  const [isLoadingRatios, setIsLoadingRatios] = useState(false);

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

  // Multi-ticker Comparison state & suggestions
  const [compareSymbol, setCompareSymbol] = useState("");
  const [activeComparisons, setActiveComparisons] = useState<
    Array<{ symbol: string; color: string }>
  >([]);
  const [isDragOverChart, setIsDragOverChart] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [compareSuggestions, setCompareSuggestions] = useState<
    {
      symbol: string;
      name: string;
      exchange: string;
      price?: number;
      changePct?: number;
    }[]
  >([]);
  const [isSearchingCompare, setIsSearchingCompare] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [watchlistTickers, setWatchlistTickers] = useState<string[]>([]);
  const swappingSymbolRef = useRef<string | null>(null);

  const compareInputRef = useRef<HTMLInputElement>(null);
  const compareContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isComparing) {
      const list = loadWatchlist();
      const filtered = list.filter(
        (s) => s.toUpperCase() !== symbol.toUpperCase(),
      );
      setWatchlistTickers(filtered);
    }
  }, [isComparing, symbol]);

  useEffect(() => {
    if (isComparing && compareInputRef.current) {
      compareInputRef.current.focus();
    }
  }, [isComparing]);

  // Click outside to close comparison dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        compareContainerRef.current &&
        !compareContainerRef.current.contains(e.target as Node)
      ) {
        setIsComparing(false);
        setCompareSuggestions([]);
      }
    };
    if (isComparing) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isComparing]);

  // Search suggestions for comparison
  useEffect(() => {
    if (!isComparing) {
      setCompareSuggestions([]);
      return;
    }

    const trimmed = compareSymbol.trim();
    if (!trimmed) {
      setCompareSuggestions([]);
      setIsSearchingCompare(false);
      return;
    }

    setIsSearchingCompare(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          const items = (data.results || []).filter(
            (item: any) => item.symbol !== symbol,
          );
          setCompareSuggestions(items);
          setSelectedSuggestionIndex(0);
        }
      } catch (err) {
        console.error("Lỗi tìm kiếm mã so sánh:", err);
      } finally {
        setIsSearchingCompare(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [compareSymbol, isComparing, symbol]);

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

  // Fetch valuation ratios (P/E, P/B, P/S, etc.)
  useEffect(() => {
    let isCancelled = false;
    const fetchValuationRatios = async () => {
      setIsLoadingRatios(true);
      try {
        const res = await fetch(`/api/ratios?symbol=${symbol}`);
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled) {
            setRatios(data);
          }
        } else {
          if (!isCancelled) setRatios(null);
        }
      } catch {
        if (!isCancelled) setRatios(null);
      } finally {
        if (!isCancelled) {
          setIsLoadingRatios(false);
        }
      }
    };

    fetchValuationRatios();
    return () => {
      isCancelled = true;
    };
  }, [symbol]);

  // Initialize Lightweight Charts
  useEffect(() => {
    const wrapper = chartWrapperRef.current;
    const container = chartContainerRef.current;
    if (!container || !wrapper) return;

    container.innerHTML = "";

    const isDark = document.documentElement.classList.contains("dark");
    const bgColor = isDark ? "#171718" : "#ffffff";
    const textColor = isDark ? "#a1a1aa" : "#64748b";
    const gridColor = isDark
      ? "rgba(255, 255, 255, 0.04)"
      : "rgba(0, 0, 0, 0.04)";

    const initWidth = wrapper.clientWidth || container.clientWidth || 600;
    const initHeight = wrapper.clientHeight || container.clientHeight || 350;

    const chart = createChart(container, {
      width: Math.max(100, initWidth),
      height: Math.max(100, initHeight),
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
        borderColor: isDark ? "#27272a" : "#e2e8f0",
      },
      timeScale: {
        borderColor: isDark ? "#27272a" : "#e2e8f0",
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
        const timeKey = String(param.time);
        const prevClose = prevCloseMapRef.current.get(timeKey);
        const refPrice = prevClose !== undefined ? prevClose : candleData.open;
        const changePct =
          refPrice > 0 ? ((candleData.close - refPrice) / refPrice) * 100 : 0;

        setHoveredData({
          time: timeKey,
          open: candleData.open,
          high: candleData.high,
          low: candleData.low,
          close: candleData.close,
          volume: volData?.value || 0,
          changePct,
        });
      }
    });

    let animationFrameId: number | null = null;
    const resizeObserver = new ResizeObserver((entries) => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      animationFrameId = window.requestAnimationFrame(() => {
        if (!entries || entries.length === 0) return;
        const entry = entries[0];
        if (entry && entry.contentRect && chartInstanceRef.current) {
          const w = Math.floor(entry.contentRect.width);
          const h = Math.floor(entry.contentRect.height);
          if (w > 50 && h > 50) {
            chartInstanceRef.current.applyOptions({
              width: w,
              height: h,
            });
          }
        }
      });
    });
    resizeObserver.observe(wrapper);

    // Dynamic theme (light / dark) synchronizer
    const applyThemeOptions = () => {
      const isDarkNow = document.documentElement.classList.contains("dark");
      const currentBg = isDarkNow ? "#171718" : "#ffffff";
      const currentText = isDarkNow ? "#a1a1aa" : "#64748b";
      const currentGrid = isDarkNow
        ? "rgba(255, 255, 255, 0.04)"
        : "rgba(0, 0, 0, 0.04)";
      const currentBorder = isDarkNow ? "#27272a" : "#e2e8f0";

      chart.applyOptions({
        layout: {
          background: { type: ColorType.Solid, color: currentBg },
          textColor: currentText,
        },
        grid: {
          vertLines: { color: currentGrid },
          horzLines: { color: currentGrid },
        },
        rightPriceScale: {
          borderColor: currentBorder,
        },
        timeScale: {
          borderColor: currentBorder,
        },
      });
    };

    const themeObserver = new MutationObserver(() => {
      applyThemeOptions();
    });

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMediaChange = () => {
      applyThemeOptions();
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleMediaChange);
    }

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      resizeObserver.disconnect();
      themeObserver.disconnect();
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleMediaChange);
      }
      compareSeriesMapRef.current.clear();
      chart.remove();
      chartInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!candles || candles.length === 0) return;

    const map = new Map<string, number>();
    for (let i = 0; i < candles.length; i++) {
      if (i > 0) {
        map.set(String(candles[i].time), candles[i - 1].close);
      }
    }
    prevCloseMapRef.current = map;

    if (candleSeriesRef.current) {
      candleSeriesRef.current.setData(
        candles.map((c) => ({
          time: c.time as any,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        })),
      );
    }

    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.setData(
        candles.map((c) => ({
          time: c.time as any,
          value: c.volume,
          color:
            c.close >= c.open
              ? "rgba(16, 185, 129, 0.4)"
              : "rgba(239, 68, 68, 0.4)",
        })),
      );
    }

    if (sma20SeriesRef.current) {
      if (showSma20) {
        const smaData = calculateSMA(candles, 20);
        sma20SeriesRef.current.setData(
          smaData.map((d) => ({ time: d.time as any, value: d.value })),
        );
      } else {
        sma20SeriesRef.current.setData([]);
      }
    }

    if (sma50SeriesRef.current) {
      if (showSma50) {
        const smaData = calculateSMA(candles, 50);
        sma50SeriesRef.current.setData(
          smaData.map((d) => ({ time: d.time as any, value: d.value })),
        );
      } else {
        sma50SeriesRef.current.setData([]);
      }
    }

    if (chartInstanceRef.current) {
      chartInstanceRef.current.timeScale().fitContent();
    }
  }, [candles, showSma20, showSma50]);

  const handleAddComparison = async (
    e?: React.FormEvent,
    overrideSymbol?: string,
  ) => {
    if (e) e.preventDefault();
    const sym = (overrideSymbol || compareSymbol).trim().toUpperCase();
    if (!sym || sym === symbol) return;

    if (activeComparisons.some((c) => c.symbol === sym)) {
      return; // Đã có trong danh sách so sánh
    }

    setCompareLoading(true);
    try {
      const days = TIMEFRAME_DAYS[timeframe] || defaultDays;
      const res = await fetch(`/api/candles?symbol=${sym}&days=${days}`);
      if (!res.ok) throw new Error("Không tải được mã so sánh " + sym);
      const data = await res.json();
      const compCandles = data.candles as CandleItem[];

      if (!compCandles || compCandles.length === 0) {
        throw new Error("Không có dữ liệu nến cho mã " + sym);
      }

      const normData = calculateNormalizedPercentage(compCandles);

      if (chartInstanceRef.current) {
        const usedColors = new Set(activeComparisons.map((c) => c.color));
        const color =
          COMPARE_PALETTE.find((c) => !usedColors.has(c)) ||
          COMPARE_PALETTE[activeComparisons.length % COMPARE_PALETTE.length];

        const series = chartInstanceRef.current.addLineSeries({
          color: color,
          lineWidth: 2,
          title: sym,
          priceScaleId: "compare",
        });

        series.priceScale().applyOptions({
          scaleMargins: { top: 0.1, bottom: 0.2 },
        });

        series.setData(
          normData.map((d) => ({ time: d.time as any, value: d.value })),
        );

        compareSeriesMapRef.current.set(sym, series);

        setActiveComparisons((prev) => [...prev, { symbol: sym, color }]);
      }
    } catch (err: any) {
      alert(err.message || "Lỗi so sánh");
    } finally {
      setCompareLoading(false);
      setCompareSymbol("");
      setCompareSuggestions([]);
    }
  };

  const removeComparisonSymbol = (sym: string) => {
    const series = compareSeriesMapRef.current.get(sym);
    if (series && chartInstanceRef.current) {
      try {
        chartInstanceRef.current.removeSeries(series);
      } catch {
        // ignore if already removed
      }
    }
    compareSeriesMapRef.current.delete(sym);
    setActiveComparisons((prev) => prev.filter((c) => c.symbol !== sym));
  };

  const handleSwapComparisonWithPrimary = async (targetSymbol: string) => {
    const oldPrimary = symbol;
    if (!targetSymbol || targetSymbol === oldPrimary) return;

    swappingSymbolRef.current = targetSymbol;

    // 1. Remove targetSymbol series from Lightweight Chart
    const targetSeries = compareSeriesMapRef.current.get(targetSymbol);
    if (targetSeries && chartInstanceRef.current) {
      try {
        chartInstanceRef.current.removeSeries(targetSeries);
      } catch (err) {
        console.error("Lỗi gỡ bỏ series so sánh:", err);
      }
    }
    compareSeriesMapRef.current.delete(targetSymbol);

    // 2. Fetch or reuse candles of oldPrimary to create its comparison line series
    let oldCandles = candles;
    if (!oldCandles || oldCandles.length === 0) {
      try {
        const days = TIMEFRAME_DAYS[timeframe] || defaultDays;
        const res = await fetch(
          `/api/candles?symbol=${oldPrimary}&days=${days}`,
        );
        if (res.ok) {
          const data = await res.json();
          oldCandles = data.candles || [];
        }
      } catch (err) {
        console.error("Lỗi tải nến cho mã cũ khi hoán đổi:", err);
      }
    }

    if (oldCandles && oldCandles.length > 0 && chartInstanceRef.current) {
      const normData = calculateNormalizedPercentage(oldCandles);
      const purpleColor = "#a855f7"; // Mã chính trước đó thành mã tím

      const oldPrimarySeries = chartInstanceRef.current.addLineSeries({
        color: purpleColor,
        lineWidth: 2,
        title: oldPrimary,
        priceScaleId: "compare",
      });

      oldPrimarySeries.priceScale().applyOptions({
        scaleMargins: { top: 0.1, bottom: 0.2 },
      });

      oldPrimarySeries.setData(
        normData.map((d) => ({ time: d.time as any, value: d.value })),
      );

      compareSeriesMapRef.current.set(oldPrimary, oldPrimarySeries);
    }

    // 3. Update activeComparisons state: targetSymbol is removed, oldPrimary is added as purple
    setActiveComparisons((prev) => {
      const remaining = prev.filter((c) => c.symbol !== targetSymbol);
      const updated = remaining.map((c) => {
        if (c.color === "#a855f7") {
          const nextColor =
            COMPARE_PALETTE.find(
              (col) =>
                col !== "#a855f7" && !remaining.some((r) => r.color === col),
            ) || "#06b6d4";
          const s = compareSeriesMapRef.current.get(c.symbol);
          if (s) {
            s.applyOptions({ color: nextColor });
          }
          return { ...c, color: nextColor };
        }
        return c;
      });
      return [{ symbol: oldPrimary, color: "#a855f7" }, ...updated];
    });

    // 4. Notify parent to swap active symbol with targetSymbol in-place
    if (onSwapSymbol) {
      onSwapSymbol(oldPrimary, targetSymbol);
    } else if (onSelectSymbol) {
      onSelectSymbol(targetSymbol);
    }
  };

  // Re-synchronize all active comparison series when timeframe changes
  useEffect(() => {
    if (activeComparisons.length === 0 || !chartInstanceRef.current) return;
    let isCancelled = false;

    const refreshComparisons = async () => {
      const days = TIMEFRAME_DAYS[timeframe] || defaultDays;
      for (const comp of activeComparisons) {
        try {
          const res = await fetch(
            `/api/candles?symbol=${comp.symbol}&days=${days}`,
          );
          if (!res.ok) continue;
          const data = await res.json();
          const compCandles = data.candles as CandleItem[];
          if (!compCandles || compCandles.length === 0) continue;

          const normData = calculateNormalizedPercentage(compCandles);
          const series = compareSeriesMapRef.current.get(comp.symbol);
          if (series && !isCancelled) {
            series.setData(
              normData.map((d) => ({ time: d.time as any, value: d.value })),
            );
          }
        } catch {
          // Skip individual comparison fetch failure
        }
      }
    };

    refreshComparisons();
    return () => {
      isCancelled = true;
    };
  }, [timeframe, defaultDays]);

  // Remove comparison if primary symbol becomes the compared symbol
  useEffect(() => {
    if (swappingSymbolRef.current === symbol) {
      swappingSymbolRef.current = null;
      return;
    }
    if (activeComparisons.some((c) => c.symbol === symbol)) {
      removeComparisonSymbol(symbol);
    }
  }, [symbol]);

  // Drag-and-drop to chart overlay handler
  const handleChartDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverChart(true);
  };

  const handleChartDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleChartDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverChart(false);
  };

  const handleChartDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverChart(false);
    const droppedSymbol =
      e.dataTransfer.getData("application/x-stock-ticker") ||
      e.dataTransfer.getData("text/plain");
    const cleanSym = droppedSymbol.trim().toUpperCase();
    if (
      cleanSym &&
      cleanSym !== symbol &&
      cleanSym.length >= 3 &&
      cleanSym.length <= 10
    ) {
      handleAddComparison(undefined, cleanSym);
    }
  };

  const selectComparisonSymbol = (sym: string) => {
    handleAddComparison(undefined, sym);
    setIsComparing(false);
    setCompareSymbol("");
    setCompareSuggestions([]);
  };

  const handleCompareKeyDown = (e: React.KeyboardEvent) => {
    const isTyping = compareSymbol.trim().length > 0;
    const activeCount = isTyping
      ? compareSuggestions.length
      : watchlistTickers.length;

    if (e.key === "Escape") {
      setIsComparing(false);
      setCompareSymbol("");
      setCompareSuggestions([]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (activeCount > 0) {
        setSelectedSuggestionIndex((prev) => (prev + 1) % activeCount);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (activeCount > 0) {
        setSelectedSuggestionIndex(
          (prev) => (prev - 1 + activeCount) % activeCount,
        );
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isTyping) {
        if (compareSuggestions[selectedSuggestionIndex]) {
          selectComparisonSymbol(
            compareSuggestions[selectedSuggestionIndex].symbol,
          );
        } else if (compareSymbol.trim()) {
          selectComparisonSymbol(compareSymbol.trim().toUpperCase());
        }
      } else {
        if (watchlistTickers[selectedSuggestionIndex]) {
          selectComparisonSymbol(watchlistTickers[selectedSuggestionIndex]);
        }
      }
    }
  };

  const latestCandle = candles[candles.length - 1];
  const prevCandle = candles.length > 1 ? candles[candles.length - 2] : null;
  const refPrice = prevCandle
    ? prevCandle.close
    : latestCandle
      ? latestCandle.open
      : 0;
  const latestChangePct =
    latestCandle && refPrice > 0
      ? ((latestCandle.close - refPrice) / refPrice) * 100
      : 0;

  const displayData =
    hoveredData ||
    (latestCandle
      ? {
          time: latestCandle.time,
          open: latestCandle.open,
          high: latestCandle.high,
          low: latestCandle.low,
          close: latestCandle.close,
          volume: latestCandle.volume,
          changePct: latestChangePct,
        }
      : null);

  const change = displayData?.changePct || 0;
  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <div className="flex flex-col w-full h-full select-none bg-white dark:bg-[#171718] overflow-hidden">
      {/* Top Header of Card: Title & Ticker Tabs */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 border-b border-slate-100 dark:border-zinc-800/60">
        <div className="flex items-center gap-2">
          {dragHandle}
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", symbol);
              e.dataTransfer.setData("application/x-stock-ticker", symbol);
              e.dataTransfer.effectAllowed = "copy";
            }}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 -ml-1 rounded-lg cursor-grab active:cursor-grabbing"
            title={`Kéo mã ${symbol} vào khung Chat để AI phân tích`}
          >
            <span className="font-bold text-lg font-mono text-slate-900 dark:text-white">
              {symbol}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 font-medium">
              {symbol === "HNX" ? "HNX" : symbol === "UPCOM" ? "UPCOM" : "HOSE"}
            </span>
            <GripVerticalIcon
              size={13}
              className="text-slate-400 dark:text-zinc-500 opacity-50"
            />
          </div>
        </div>

        {/* Ticker Tabs & Compare */}
        <div className="flex items-center gap-1.5 py-0.5">
          {/* Scrollable Tabs */}
          {openSymbols && openSymbols.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-[180px] sm:max-w-xs md:max-w-sm py-0.5">
              {openSymbols.map((s) => (
                <button
                  key={s}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", s);
                    e.dataTransfer.setData("application/x-stock-ticker", s);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => onSelectSymbol && onSelectSymbol(s)}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all shrink-0 cursor-grab active:cursor-grabbing ${
                    s === symbol
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700"
                  }`}
                  title={`Kéo tab ${s} vào khung Chat để phân tích hoặc nhấp để mở biểu đồ`}
                >
                  <span>{s}</span>
                  {openSymbols.length > 1 && onCloseSymbol && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseSymbol(s);
                      }}
                      className="text-slate-300 hover:text-rose-300 ml-0.5 cursor-pointer"
                      title="Đóng tab này"
                    >
                      <XIcon size={12} animateOnHover />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Active Comparison Badges */}
          {activeComparisons.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-[240px] sm:max-w-xs md:max-w-md py-0.5">
              {activeComparisons.map((comp) => (
                <div
                  key={comp.symbol}
                  onClick={() => handleSwapComparisonWithPrimary(comp.symbol)}
                  style={{ borderColor: comp.color }}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-bold rounded-lg border bg-white dark:bg-zinc-900 shadow-2xs shrink-0 cursor-pointer select-none"
                >
                  <span style={{ color: comp.color }}>{comp.symbol}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeComparisonSymbol(comp.symbol);
                    }}
                    className="text-slate-400 hover:text-rose-600 transition-colors ml-0.5 cursor-pointer"
                  >
                    <XIcon size={12} animateOnHover />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Merged + So sánh Button / Input */}
          {isComparing ? (
            <div
              ref={compareContainerRef}
              className="relative flex items-center shrink-0 z-50"
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (compareSymbol.trim()) {
                    selectComparisonSymbol(compareSymbol.trim().toUpperCase());
                  }
                }}
                className="flex items-center"
              >
                <div className="relative flex items-center">
                  <input
                    ref={compareInputRef}
                    type="text"
                    value={compareSymbol}
                    placeholder="MÃ SO SÁNH..."
                    onChange={(e) => setCompareSymbol(e.target.value)}
                    onKeyDown={handleCompareKeyDown}
                    className="pl-2.5 pr-7 py-1 text-xs uppercase bg-slate-100 dark:bg-zinc-800 border-none outline-none focus:outline-none focus:ring-0 rounded-lg w-40 font-mono text-slate-800 dark:text-zinc-200 placeholder:text-slate-400 dark:placeholder:text-zinc-500 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={compareLoading || !compareSymbol.trim()}
                    className="absolute right-1 p-0.5 text-emerald-600 hover:text-emerald-500 disabled:opacity-30 transition-colors cursor-pointer"
                    title="Xác nhận so sánh"
                  >
                    <GitCompareArrowsIcon size={12} animateOnHover />
                  </button>
                </div>
              </form>

              {/* Suggestions Dropdown: Only shown if user is typing or if watchlist has tickers */}
              {(compareSymbol.trim().length > 0 || watchlistTickers.length > 0) && (
                <div
                  onMouseDown={(e) => e.preventDefault()}
                  className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 w-64 bg-white dark:bg-[#171718] border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden"
                >
                  <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-900/60 text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>
                      {compareSymbol.trim() ? "Gợi ý mã" : "Mã trong danh mục"}
                    </span>
                    {isSearchingCompare && (
                      <span className="animate-pulse">Đang tìm...</span>
                    )}
                  </div>

                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/40">
                    {compareSymbol.trim() ? (
                      compareSuggestions.length > 0 ? (
                        compareSuggestions.map((item, idx) => {
                          const isSelected = idx === selectedSuggestionIndex;
                          const hasPrice = item.price !== undefined;
                          const isPositive = (item.changePct || 0) > 0;
                          const isNegative = (item.changePct || 0) < 0;

                          const isAlreadyCompared = activeComparisons.some(
                            (c) => c.symbol === item.symbol,
                          );
                          const comparedColor = activeComparisons.find(
                            (c) => c.symbol === item.symbol,
                          )?.color;

                          return (
                            <div
                              key={item.symbol}
                              onClick={() => {
                                if (isAlreadyCompared) {
                                  removeComparisonSymbol(item.symbol);
                                } else {
                                  selectComparisonSymbol(item.symbol);
                                }
                              }}
                              onMouseEnter={() => setSelectedSuggestionIndex(idx)}
                              className={`flex items-center justify-between px-3 py-2 cursor-pointer text-xs transition-colors ${
                                isSelected
                                  ? "bg-emerald-50 dark:bg-emerald-950/30"
                                  : "hover:bg-slate-50 dark:hover:bg-zinc-800/40"
                              }`}
                            >
                              <div className="flex flex-col min-w-0 mr-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold font-mono text-slate-900 dark:text-white text-xs">
                                    {item.symbol}
                                  </span>
                                  {item.exchange && (
                                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
                                      {item.exchange}
                                    </span>
                                  )}
                                  {isAlreadyCompared && (
                                    <span
                                      style={{
                                        backgroundColor: `${comparedColor}20`,
                                        color: comparedColor,
                                        borderColor: `${comparedColor}50`,
                                      }}
                                      className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border"
                                    >
                                      Đang so sánh
                                    </span>
                                  )}
                                </div>
                                {item.name && (
                                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 truncate">
                                    {item.name}
                                  </span>
                                )}
                              </div>

                              {hasPrice && (
                                <div className="text-right font-mono shrink-0">
                                  <div className="font-bold text-slate-800 dark:text-zinc-200 text-[11px]">
                                    {formatPrice(item.price)}
                                  </div>
                                  <div
                                    className={`text-[9px] font-semibold ${
                                      isPositive
                                        ? "text-emerald-500"
                                        : isNegative
                                          ? "text-rose-500"
                                          : "text-amber-500"
                                    }`}
                                  >
                                    {formatPercent(item.changePct)}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : !isSearchingCompare ? (
                        <div className="px-3 py-3 text-center text-xs text-slate-400 dark:text-zinc-500">
                          Nhấn Enter để thử so sánh với &quot;
                          {compareSymbol.trim().toUpperCase()}&quot;
                        </div>
                      ) : null
                    ) : (
                      watchlistTickers.map((ticker, idx) => {
                        const isSelected = idx === selectedSuggestionIndex;
                        const isAlreadyCompared = activeComparisons.some(
                          (c) => c.symbol === ticker,
                        );
                        const comparedColor = activeComparisons.find(
                          (c) => c.symbol === ticker,
                        )?.color;

                        return (
                          <div
                            key={ticker}
                            onClick={() => {
                              if (isAlreadyCompared) {
                                removeComparisonSymbol(ticker);
                              } else {
                                selectComparisonSymbol(ticker);
                              }
                            }}
                            onMouseEnter={() => setSelectedSuggestionIndex(idx)}
                            className={`flex items-center justify-between px-3 py-2 cursor-pointer text-xs transition-colors ${
                              isSelected
                                ? "bg-emerald-50 dark:bg-emerald-950/30"
                                : "hover:bg-slate-50 dark:hover:bg-zinc-800/40"
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold font-mono text-slate-900 dark:text-white text-xs">
                                {ticker}
                              </span>
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
                                {ticker === "HNX" ? "HNX" : ticker === "UPCOM" ? "UPCOM" : "HOSE"}
                              </span>
                              {isAlreadyCompared && (
                                <span
                                  style={{
                                    backgroundColor: `${comparedColor}20`,
                                    color: comparedColor,
                                    borderColor: `${comparedColor}50`,
                                  }}
                                  className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border"
                                >
                                  Đang so sánh
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsComparing(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-medium rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 transition-colors shrink-0 cursor-pointer"
              title="So sánh với mã cổ phiếu khác"
            >
              <GitCompareArrowsIcon size={12} animateOnHover />
              <span>+ So sánh</span>
            </button>
          )}
        </div>
      </div>

      {/* Middle Row: Large Price & Control Bar */}
      <div className="flex flex-wrap items-end justify-between gap-2.5 px-3 pt-2 pb-1 sm:px-4">
        {/* Left: Big Price Display */}
        {displayData ? (
          <div>
            <div className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white tracking-tight">
              {formatPrice(displayData.close)}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                  isPositive
                    ? "bg-emerald-500/10 text-emerald-500"
                    : isNegative
                      ? "bg-rose-500/10 text-rose-500"
                      : "bg-amber-500/10 text-amber-500"
                }`}
              >
                {isPositive && <TrendingUpIcon size={13} animateOnHover />}
                {isNegative && <TrendingDownIcon size={13} animateOnHover />}
                <span>{formatPercent(displayData.changePct)}</span>
              </span>
              <span className="text-xs text-slate-400 dark:text-zinc-500 font-mono">
                KL: {formatVolume(displayData.volume)}
              </span>
            </div>
          </div>
        ) : (
          <div className="h-12 w-32 bg-slate-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
        )}

        {/* Right: Timeframe, Overlays, Compare & Maximize */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {/* Timeframe Pill Group */}
          <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
            {(["1M", "3M", "6M", "1Y"] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  timeframe === tf
                    ? "bg-emerald-600 text-white font-bold shadow-xs"
                    : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* SMA Overlays */}
          <div className="flex items-center gap-1 font-mono">
            <button
              type="button"
              onClick={() => setShowSma20(!showSma20)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                showSma20
                  ? "bg-sky-600 hover:bg-sky-500 text-white shadow-xs border-sky-600"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-700 border-slate-200 dark:border-zinc-700"
              }`}
              title="Bật/tắt đường chỉ báo SMA20"
            >
              SMA20
            </button>
            <button
              type="button"
              onClick={() => setShowSma50(!showSma50)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                showSma50
                  ? "bg-orange-600 hover:bg-orange-500 text-white shadow-xs border-orange-600"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-700 border-slate-200 dark:border-zinc-700"
              }`}
              title="Bật/tắt đường chỉ báo SMA50"
            >
              SMA50
            </button>
          </div>

          {/* Maximize Toggle */}
          {onToggleMaximize && (
            <button
              onClick={onToggleMaximize}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 text-xs transition-colors"
              title={isMaximized ? "Thu nhỏ" : "Phóng to toàn màn hình"}
            >
              {isMaximized ? (
                <MinimizeIcon size={15} animateOnHover />
              ) : (
                <Maximize2Icon size={15} animateOnHover />
              )}
            </button>
          )}

          {/* Close Module */}
          {onCloseModule && (
            <button
              onClick={onCloseModule}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-rose-600 hover:border-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:border-rose-600 dark:hover:text-white text-slate-400 border border-slate-200 dark:border-zinc-700 text-xs transition-colors cursor-pointer"
              title="Đóng module Biểu đồ"
            >
              <XIcon size={15} animateOnHover />
            </button>
          )}
        </div>
      </div>

      {/* OHLC Bar */}
      {displayData && (
        <div className="flex flex-wrap items-center justify-between gap-y-1 gap-x-3 mx-3 sm:mx-4 px-2.5 py-1 my-0.5 rounded-md bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800/60 text-[11px] font-mono text-slate-500 dark:text-zinc-400">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Ngày:{" "}
              <strong className="text-slate-700 dark:text-zinc-200">
                {displayData.time}
              </strong>
            </span>
            <span>
              O:{" "}
              <strong className="text-slate-700 dark:text-zinc-200">
                {formatPrice(displayData.open)}
              </strong>
            </span>
            <span>
              H:{" "}
              <strong className="text-slate-700 dark:text-zinc-200">
                {formatPrice(displayData.high)}
              </strong>
            </span>
            <span>
              L:{" "}
              <strong className="text-slate-700 dark:text-zinc-200">
                {formatPrice(displayData.low)}
              </strong>
            </span>
            <span>
              C:{" "}
              <strong className="text-slate-700 dark:text-zinc-200">
                {formatPrice(displayData.close)}
              </strong>
            </span>
            <span>
              Khối lượng:{" "}
              <strong className="text-slate-700 dark:text-zinc-200">
                {formatVolume(displayData.volume)}
              </strong>
            </span>
          </div>
        </div>
      )}

      {/* Financial Valuation & Industry Benchmark Metrics */}
      <StockFinancialMetrics
        ratios={ratios}
        isLoading={isLoadingRatios}
        symbol={symbol}
      />

      {/* Chart Canvas: Guaranteed min-height and auto-resize with panel */}
      <div
        ref={chartWrapperRef}
        onDragEnter={handleChartDragEnter}
        onDragOver={handleChartDragOver}
        onDragLeave={handleChartDragLeave}
        onDrop={handleChartDrop}
        className="relative w-full flex-1 min-h-[200px] overflow-hidden bg-white dark:bg-[#171718]"
      >
        {isDragOverChart && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-purple-500/15 dark:bg-purple-950/50 backdrop-blur-xs border-2 border-dashed border-purple-500 rounded-lg pointer-events-none animate-in fade-in">
            <div className="px-4 py-2 rounded-xl bg-slate-900/90 text-white font-mono text-xs font-semibold shadow-lg border border-purple-400 flex items-center gap-2">
              <GitCompareArrowsIcon size={16} className="text-purple-400" />
              <span>Thả mã vào đây để so sánh trên biểu đồ</span>
            </div>
          </div>
        )}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-[#171718]/80 z-10">
            <span className="text-xs font-mono text-emerald-500 animate-pulse">
              Đang tải nến {symbol}...
            </span>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-[#171718]/90 z-10 p-4">
            <p className="text-rose-500 text-xs mb-2">{error}</p>
            <button
              onClick={fetchCandles}
              className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg text-xs cursor-pointer"
            >
              <RefreshCwIcon size={12} animateOnHover />
              <span>Thử lại</span>
            </button>
          </div>
        )}
        <div
          ref={chartContainerRef}
          className="absolute inset-0 w-full h-full"
        />
      </div>
    </div>
  );
}
