"use client";

import React, { useState, useEffect } from "react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import {
  loadDashboardLayout,
  saveDashboardLayout,
  DEFAULT_LAYOUT,
  DashboardWidget,
  loadModuleVisibility,
  saveModuleVisibility,
  DEFAULT_MODULE_VISIBILITY,
  ModuleVisibility,
} from "@/lib/storage/layout-storage";
import { StockChart } from "../chart/stock-chart";
import { WatchlistWidget } from "../watchlist/watchlist-widget";
import { MarketOverviewWidget } from "./market-overview-widget";
import { MarketTickerStrip } from "./market-ticker-strip";
import {
  CheckIcon,
  PlusIcon,
  RefreshCcwIcon,
  LayoutGridIcon,
  ChartLineIcon,
  BookmarkIcon,
  EarthIcon,
} from "lucide-animated";

interface DashboardContainerProps {
  onAnalyzeTicker?: (ticker: string) => void;
  externalAddChartTicker?: string | null;
  onClearExternalChartTicker?: () => void;
}

export function DashboardContainer({
  onAnalyzeTicker: _onAnalyzeTicker,
  externalAddChartTicker,
  onClearExternalChartTicker,
}: DashboardContainerProps) {
  const [chartTabs, setChartTabs] = useState<string[]>(["VNINDEX"]);
  const [activeSymbol, setActiveSymbol] = useState<string>("VNINDEX");
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [modules, setModules] = useState<ModuleVisibility>(DEFAULT_MODULE_VISIBILITY);

  useEffect(() => {
    const layout = loadDashboardLayout();
    const chartSymbols = layout.widgets
      .filter((w) => w.type === "chart" && w.symbol)
      .map((w) => w.symbol as string);

    if (chartSymbols.length > 0) {
      setChartTabs(chartSymbols);
      setActiveSymbol(chartSymbols[0]);
    } else {
      setChartTabs(["VNINDEX"]);
      setActiveSymbol("VNINDEX");
    }

    const savedVis = loadModuleVisibility();
    setModules(savedVis);
    setIsMounted(true);
  }, []);

  const persistTabs = (tabs: string[]) => {
    const widgets: DashboardWidget[] = tabs.map((sym) => ({
      id: `chart-${sym.toLowerCase()}`,
      type: "chart",
      title: `Biểu đồ ${sym}`,
      symbol: sym,
      size: "double",
    }));

    widgets.push({
      id: "watchlist-default",
      type: "watchlist",
      title: "Danh mục theo dõi",
      size: "single",
    });
    widgets.push({
      id: "market-overview-default",
      type: "market_overview",
      title: "Tổng quan thị trường",
      size: "single",
    });

    saveDashboardLayout({ version: 2, widgets });
  };

  const toggleModule = (mod: keyof ModuleVisibility) => {
    setModules((prev) => {
      const next = { ...prev, [mod]: !prev[mod] };
      saveModuleVisibility(next);
      return next;
    });
  };

  const setModuleVisible = (mod: keyof ModuleVisibility, visible: boolean) => {
    setModules((prev) => {
      if (prev[mod] === visible) return prev;
      const next = { ...prev, [mod]: visible };
      saveModuleVisibility(next);
      return next;
    });
  };

  useEffect(() => {
    if (!externalAddChartTicker || !isMounted) return;
    const sym = externalAddChartTicker.trim().toUpperCase();

    setChartTabs((prev) => {
      let updated: string[];
      if (!prev.includes(sym)) {
        updated = [...prev, sym];
      } else {
        updated = prev;
      }
      persistTabs(updated);
      return updated;
    });

    setActiveSymbol(sym);

    // If chart module was closed, reopen it so user sees the newly opened ticker
    setModuleVisible("chart", true);

    if (onClearExternalChartTicker) {
      onClearExternalChartTicker();
    }
  }, [externalAddChartTicker, isMounted, onClearExternalChartTicker]);

  const handleSelectSymbol = (sym: string) => {
    const upper = sym.toUpperCase();
    if (!chartTabs.includes(upper)) {
      const updated = [...chartTabs, upper];
      setChartTabs(updated);
      persistTabs(updated);
    }
    setActiveSymbol(upper);
    setModuleVisible("chart", true);
  };

  const handleAddChartTab = (sym: string) => {
    const upper = sym.toUpperCase();
    if (!chartTabs.includes(upper)) {
      const updated = [...chartTabs, upper];
      setChartTabs(updated);
      persistTabs(updated);
    }
    setActiveSymbol(upper);
  };

  const handleCloseChartTab = (sym: string) => {
    if (chartTabs.length <= 1) return;
    const updated = chartTabs.filter((t) => t !== sym);
    setChartTabs(updated);
    persistTabs(updated);
    if (activeSymbol === sym) {
      setActiveSymbol(updated[0]);
    }
  };

  const handleResetLayout = () => {
    saveDashboardLayout(DEFAULT_LAYOUT);
    saveModuleVisibility(DEFAULT_MODULE_VISIBILITY);
    try {
      localStorage.removeItem("dashboard-vertical-panels-v1");
      localStorage.removeItem("dashboard-bottom-panels-v1");
    } catch {
      // Ignore localStorage error if storage is unavailable
    }
    setModules(DEFAULT_MODULE_VISIBILITY);
    setChartTabs(["VNINDEX"]);
    setActiveSymbol("VNINDEX");
    setIsMaximized(false);
  };

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-slate-400 font-mono">
        Đang khởi tạo workspace...
      </div>
    );
  }

  const hasBottomRow = modules.watchlist || modules.overview;

  const renderBottomRow = () => {
    if (modules.watchlist && modules.overview) {
      return (
        <PanelGroup
          direction="horizontal"
          id="dashboard-bottom-panels"
          autoSaveId="dashboard-bottom-panels-v1"
          className="h-full w-full flex-1"
        >
          <Panel
            id="panel-watchlist"
            defaultSize={58}
            minSize={25}
            className="flex flex-col min-h-0 overflow-hidden"
          >
            <WatchlistWidget
              onSelectSymbol={handleSelectSymbol}
              onCloseModule={() => setModuleVisible("watchlist", false)}
            />
          </Panel>

          <PanelResizeHandle className="w-1 bg-slate-200/80 dark:bg-zinc-800/80 hover:bg-emerald-500 dark:hover:bg-emerald-500 transition-colors cursor-col-resize shrink-0" />

          <Panel
            id="panel-overview"
            defaultSize={42}
            minSize={25}
            className="flex flex-col min-h-0 overflow-hidden"
          >
            <MarketOverviewWidget
              onCloseModule={() => setModuleVisible("overview", false)}
            />
          </Panel>
        </PanelGroup>
      );
    }

    if (modules.watchlist) {
      return (
        <div className="h-full w-full flex flex-col min-h-0 overflow-hidden">
          <WatchlistWidget
            onSelectSymbol={handleSelectSymbol}
            onCloseModule={() => setModuleVisible("watchlist", false)}
          />
        </div>
      );
    }

    if (modules.overview) {
      return (
        <div className="h-full w-full flex flex-col min-h-0 overflow-hidden">
          <MarketOverviewWidget
            onCloseModule={() => setModuleVisible("overview", false)}
          />
        </div>
      );
    }

    return null;
  };

  const renderWorkspace = () => {
    if (isMaximized) {
      return (
        <div className="h-full w-full flex flex-col min-h-0 overflow-hidden">
          <StockChart
            symbol={activeSymbol}
            openSymbols={chartTabs}
            activeSymbol={activeSymbol}
            onSelectSymbol={handleSelectSymbol}
            onAddSymbol={handleAddChartTab}
            onCloseSymbol={handleCloseChartTab}
            isMaximized={true}
            onToggleMaximize={() => setIsMaximized(false)}
            onCloseModule={() => setIsMaximized(false)}
          />
        </div>
      );
    }

    if (modules.chart && hasBottomRow) {
      return (
        <PanelGroup
          direction="vertical"
          id="dashboard-vertical-panels"
          autoSaveId="dashboard-vertical-panels-v1"
          className="h-full w-full flex-1"
        >
          <Panel
            id="panel-chart"
            defaultSize={58}
            minSize={25}
            className="flex flex-col min-h-0 overflow-hidden"
          >
            <StockChart
              symbol={activeSymbol}
              openSymbols={chartTabs}
              activeSymbol={activeSymbol}
              onSelectSymbol={handleSelectSymbol}
              onAddSymbol={handleAddChartTab}
              onCloseSymbol={handleCloseChartTab}
              isMaximized={false}
              onToggleMaximize={() => setIsMaximized(true)}
              onCloseModule={() => setModuleVisible("chart", false)}
            />
          </Panel>

          <PanelResizeHandle className="h-1 bg-slate-200/80 dark:bg-zinc-800/80 hover:bg-emerald-500 dark:hover:bg-emerald-500 transition-colors cursor-row-resize shrink-0" />

          <Panel
            id="panel-bottom"
            defaultSize={42}
            minSize={20}
            className="flex flex-col min-h-0 overflow-hidden"
          >
            {renderBottomRow()}
          </Panel>
        </PanelGroup>
      );
    }

    if (modules.chart && !hasBottomRow) {
      return (
        <div className="h-full w-full flex flex-col min-h-0 overflow-hidden">
          <StockChart
            symbol={activeSymbol}
            openSymbols={chartTabs}
            activeSymbol={activeSymbol}
            onSelectSymbol={handleSelectSymbol}
            onAddSymbol={handleAddChartTab}
            onCloseSymbol={handleCloseChartTab}
            isMaximized={false}
            onToggleMaximize={() => setIsMaximized(true)}
            onCloseModule={() => setModuleVisible("chart", false)}
          />
        </div>
      );
    }

    if (!modules.chart && hasBottomRow) {
      return (
        <div className="h-full w-full flex flex-col min-h-0 overflow-hidden">
          {renderBottomRow()}
        </div>
      );
    }

    // All modules closed empty state
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center font-mono">
        <LayoutGridIcon size={32} className="text-slate-300 dark:text-zinc-700 mb-3" />
        <p className="text-xs text-slate-500 dark:text-zinc-400 mb-4">
          Tất cả các module hiển thị đang được đóng.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setModuleVisible("chart", true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors cursor-pointer"
          >
            <ChartLineIcon size={14} animateOnHover />
            <span>Mở Biểu đồ</span>
          </button>
          <button
            type="button"
            onClick={() => setModuleVisible("watchlist", true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-medium transition-colors cursor-pointer"
          >
            <BookmarkIcon size={14} animateOnHover />
            <span>Mở Danh mục</span>
          </button>
          <button
            type="button"
            onClick={() => setModuleVisible("overview", true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-medium transition-colors cursor-pointer"
          >
            <EarthIcon size={14} animateOnHover />
            <span>Mở Tổng quan</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50/70 dark:bg-[#09090b] overflow-hidden select-none">
      {/* 1. Seamless Top Market Ticker Strip */}
      {!isMaximized && (
        <div className="w-full shrink-0 border-b border-slate-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-[#111113]/70 backdrop-blur-xs py-0.5 px-0">
          <MarketTickerStrip
            activeSymbol={activeSymbol}
            onSelectSymbol={handleSelectSymbol}
          />
        </div>
      )}

      {/* 2. Sleek Module Visibility & Resize Controls Toolbar */}
      {!isMaximized && (
        <div className="w-full shrink-0 flex items-center justify-between px-3 py-1 bg-white/70 dark:bg-[#111113]/70 backdrop-blur-xs border-b border-slate-200/80 dark:border-zinc-800/80 text-xs select-none">
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="text-slate-400 dark:text-zinc-500 font-medium hidden sm:inline-flex items-center gap-1 mr-0.5">
              <LayoutGridIcon size={12} animateOnHover />
              <span>Modules:</span>
            </span>

            {/* Biểu đồ */}
            <button
              type="button"
              onClick={() => toggleModule("chart")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md transition-colors cursor-pointer ${
                modules.chart
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold"
                  : "bg-slate-100 dark:bg-zinc-800/60 text-slate-400 dark:text-zinc-500 border border-transparent hover:text-slate-700 dark:hover:text-zinc-300"
              }`}
              title={modules.chart ? "Đóng module Biểu đồ" : "Mở module Biểu đồ"}
            >
              <ChartLineIcon size={13} animateOnHover />
              <span>Biểu đồ</span>
              {modules.chart ? (
                <CheckIcon size={11} animateOnHover />
              ) : (
                <PlusIcon size={11} animateOnHover />
              )}
            </button>

            {/* Danh mục */}
            <button
              type="button"
              onClick={() => toggleModule("watchlist")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md transition-colors cursor-pointer ${
                modules.watchlist
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold"
                  : "bg-slate-100 dark:bg-zinc-800/60 text-slate-400 dark:text-zinc-500 border border-transparent hover:text-slate-700 dark:hover:text-zinc-300"
              }`}
              title={modules.watchlist ? "Đóng module Danh mục" : "Mở module Danh mục"}
            >
              <BookmarkIcon size={13} animateOnHover />
              <span>Danh mục</span>
              {modules.watchlist ? (
                <CheckIcon size={11} animateOnHover />
              ) : (
                <PlusIcon size={11} animateOnHover />
              )}
            </button>

            {/* Tổng quan */}
            <button
              type="button"
              onClick={() => toggleModule("overview")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md transition-colors cursor-pointer ${
                modules.overview
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold"
                  : "bg-slate-100 dark:bg-zinc-800/60 text-slate-400 dark:text-zinc-500 border border-transparent hover:text-slate-700 dark:hover:text-zinc-300"
              }`}
              title={modules.overview ? "Đóng module Tổng quan" : "Mở module Tổng quan"}
            >
              <EarthIcon size={13} animateOnHover />
              <span>Tổng quan</span>
              {modules.overview ? (
                <CheckIcon size={11} animateOnHover />
              ) : (
                <PlusIcon size={11} animateOnHover />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetLayout}
              className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300 transition-colors cursor-pointer"
              title="Khôi phục bố cục và kích thước mặc định"
            >
              <RefreshCcwIcon size={11} animateOnHover />
              <span>Đặt lại</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Dynamic Resizable Workspace Content */}
      <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col">
        {renderWorkspace()}
      </div>
    </div>
  );
}
